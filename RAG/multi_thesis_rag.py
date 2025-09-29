# Prompt chaining for multi-step reasoning with Gemini
def prompt_chain(top_chunks, prompts, api_key):
    context = ""
    answer = ""
    for idx, prompt_text in enumerate(prompts):
        # For first prompt, build context from top_chunks
        if idx == 0:
            # Build metadata summary with numbering
            doc_infos = []
            seen_pdfs = set()
            for i, c in enumerate(top_chunks):
                meta = c['meta']
                pdf_id = meta['pdf']
                if pdf_id not in seen_pdfs:
                    doc_infos.append(f"[{i+1}] Title: {meta.get('title','') or '[Unknown]'}\n    Author: {meta.get('author','') or '[Unknown]'}\n    Year: {meta.get('publication_year','') or '[Unknown]'}\n    File: {pdf_id}")
                    seen_pdfs.add(pdf_id)
                if len(doc_infos) >= 10:
                    break
            doc_info_str = "Top 10 relevant documents found (numbered for reference):\n" + "\n".join(doc_infos) + "\n\n"
            chunk_context = "\n\n".join([f"[{i+1}] From {c['meta']['pdf']} (chunk {c['meta']['chunk_idx']}): {c['chunk']}" for i, c in enumerate(top_chunks)])
            # Add instruction for referencing numbers and formatting
            context = f"{doc_info_str}Context: {chunk_context}\n\nWhen answering, please reference the relevant thesis by its number in square brackets, e.g., [1], [2], etc., to indicate the source of each point.\n\n"
            context += (
                "Synthesize the findings from the top relevant theses in response to the following question. "
                "Group your answer by key themes or outcomes relevant to the question. "
                "Write in plain text, paragraph style, without bullet points, asterisks, or markdown formatting. "
                "Only place thesis references in square brackets immediately after the period at the end of each paragraph, never inside sentences or after other punctuation. "
                "If multiple theses support a paragraph, concatenate their numbers in square brackets at the end of the paragraph, after the period, with no space before the bracket. "
                "Do not place references anywhere else. "
                "Conclude with a summary paragraph that synthesizes the findings. After the summary, concatenate all referenced thesis numbers in square brackets (e.g., [2][5][6][8][9]), with no explanatory sentence or line break. "
                "Highlight relationships, causal links, and actionable insights. "
            )
        # Build prompt for Gemini
        full_prompt = f"{context}Question: {prompt_text}\nAnswer: "
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        data = {
            "contents": [
                {
                    "parts": [
                        {"text": full_prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 2000
            }
        }
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        raw_answer = result['candidates'][0]['content']['parts'][0]['text'].strip()
        # Post-process: move all references to end of each paragraph
        import re
        def process_paragraphs(text):
            # Split paragraphs and detect trailing reference line
            paragraphs = re.split(r'\n\s*\n', text)
            ref_pattern = re.compile(r'\[(\d+)\]')
            processed = []
            all_refs = []
            trailing_refs = []
            # Check if last paragraph is only references
            if paragraphs and ref_pattern.findall(paragraphs[-1]) and not re.search(r'[a-zA-Z]', paragraphs[-1]):
                trailing_refs = ref_pattern.findall(paragraphs[-1])
                paragraphs = paragraphs[:-1]
            for i, para in enumerate(paragraphs):
                refs = ref_pattern.findall(para)
                all_refs.extend(refs)
                # Remove all references from paragraph
                para_clean = ref_pattern.sub('', para).strip()
                # Remove space before period
                para_clean = re.sub(r'\s+\.$', '.', para_clean)
                # Only add references at end if any found
                if refs:
                    refs_str = ''.join([f'[{r}]' for r in sorted(set(refs), key=refs.index)])
                    para_clean = re.sub(r'\.$', f'.{refs_str}', para_clean)
                processed.append(para_clean)
            # For the last paragraph (summary), append only unique refs not already present at the end
            if processed:
                unique_refs = []
                for r in all_refs + trailing_refs:
                    if r not in unique_refs:
                        unique_refs.append(r)
                # Remove space before period
                processed[-1] = re.sub(r'\s+\.$', '.', processed[-1])
                # Find refs already present at end of summary
                end_refs = re.findall(r'(\[\d+\])', processed[-1].split('.')[-1])
                end_refs_set = set([ref.strip('[]') for ref in end_refs])
                # Only append refs not already present
                missing_refs = [r for r in unique_refs if r not in end_refs_set]
                refs_str = ''.join([f'[{r}]' for r in missing_refs])
                if processed[-1].endswith('.'):
                    processed[-1] = processed[-1] + refs_str
                else:
                    processed[-1] = processed[-1] + '.' + refs_str
            return '\n\n'.join(processed)
        answer = process_paragraphs(raw_answer)
        # Update context for next step
        context = f"{context}{answer}\n\n"
    return answer
import os
import glob
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import requests
from rank_bm25 import BM25Okapi
import chromadb

# 1. Extract and chunk text from all PDFs in a folder
def extract_and_chunk_pdfs(pdf_folder, chunk_size=500):
    import pytesseract
    from pdf2image import convert_from_path
    pdf_files = glob.glob(os.path.join(pdf_folder, '*.pdf'))
    all_chunks = []
    metadata = []
    for pdf_path in pdf_files:
        print(f"Processing: {pdf_path}")
        reader = PdfReader(pdf_path)
        text = ""
        py_pdf2_pages = 0
        ocr_pages = 0
        # Extract metadata
        doc_info = reader.metadata if hasattr(reader, 'metadata') else reader.documentInfo
        title = getattr(doc_info, 'title', None) or doc_info.get('/Title', '') if doc_info else ''
        author = getattr(doc_info, 'author', None) or doc_info.get('/Author', '') if doc_info else ''
        # Try to extract publication year from metadata
        publication_year = ''
        if doc_info:
            # Try /CreationDate or /ModDate
            for key in ['/CreationDate', '/ModDate']:
                date_val = doc_info.get(key, '') if isinstance(doc_info, dict) else getattr(doc_info, key, '')
                # Convert to string if not already
                if date_val:
                    date_str = str(date_val)
                    import re
                    match = re.search(r'(\d{4})', date_str)
                    if match:
                        publication_year = match.group(1)
                        break
        # If missing, try to parse year from first page
        first_page_text = ""
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
                py_pdf2_pages += 1
                if page_num == 0:
                    first_page_text = page_text
        if not title and first_page_text:
            # Try to guess title from first line
            title = first_page_text.split('\n')[0][:120]
        if not author and first_page_text:
            # Try to guess author from lines containing 'author' or similar
            for line in first_page_text.split('\n'):
                if 'author' in line.lower():
                    author = line.strip()[:120]
                    break
        if not publication_year and first_page_text:
            import re
            match = re.search(r'(19\d{2}|20\d{2})', first_page_text)
            if match:
                publication_year = match.group(1)
        # If no text extracted, try OCR
        if not text.strip():
            print(f"  No text found with PyPDF2, trying OCR...")
            try:
                images = convert_from_path(pdf_path)
                for img_num, img in enumerate(images):
                    ocr_text = pytesseract.image_to_string(img)
                    if ocr_text.strip():
                        text += ocr_text + "\n"
                        ocr_pages += 1
            except Exception as e:
                print(f"  OCR failed: {e}")
        print(f"  PyPDF2 extracted text from {py_pdf2_pages} pages.")
        print(f"  OCR extracted text from {ocr_pages} pages.")
        print(f"  Total extracted text length: {len(text)} characters.")
        words = text.split()
        chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]
        print(f"  Total chunks created: {len(chunks)}")
        for idx, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            metadata.append({
                'pdf': os.path.basename(pdf_path),
                'chunk_idx': idx,
                'title': title,
                'author': author,
                'publication_year': publication_year
            })
    return all_chunks, metadata

# 2. Embed all chunks
def embed_chunks(chunks, embedder):
    return embedder.encode(chunks)

# Build ChromaDB vector store
def build_chromadb_index(chunks, embeddings):
    client = chromadb.Client()
    collection = client.create_collection("thesis_chunks")
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        collection.add(
            documents=[chunk],
            embeddings=[emb.tolist()],
            ids=[str(i)]
        )
    return collection

# Hybrid search: BM25 + semantic (embedding) search + ChromaDB
def retrieve_top_chunks_hybrid(query, embedder, index, all_chunks, metadata, top_n=10, bm25=None, chroma_collection=None):
    # Semantic search (L2 distance)
    query_emb = embedder.encode([query])
    D, I = index.search(np.array(query_emb), top_n)
    semantic_results = set(I[0])

    # BM25 keyword search
    if bm25 is None:
        tokenized_chunks = [chunk.split() for chunk in all_chunks]
        bm25 = BM25Okapi(tokenized_chunks)
    bm25_scores = bm25.get_scores(query.split())
    bm25_top = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:top_n]
    bm25_results = set(bm25_top)

    # ChromaDB vector search (optional)
    chroma_results = set()
    if chroma_collection is not None:
        chroma_query = chroma_collection.query(
            query_embeddings=query_emb.tolist(),
            n_results=top_n
        )
        chroma_results = set([int(i) for i in chroma_query['ids'][0]])

    # Merge results
    merged = list(semantic_results | bm25_results | chroma_results)
    # Re-rank by sum of BM25 and L2 distance (lower is better for L2)
    merged_scores = [bm25_scores[i] - (D[0][list(I[0]).index(i)] if i in semantic_results else 0) for i in merged]
    top_indices = [x for _, x in sorted(zip(merged_scores, merged), reverse=True)][:top_n]
    results = []
    for idx in top_indices:
        results.append({'chunk': all_chunks[idx], 'meta': metadata[idx]})
    return results

# 3. Build FAISS index
def build_faiss_index(embeddings):
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index

# 4. Retrieve top-N relevant chunks
def retrieve_top_chunks(query, embedder, index, all_chunks, metadata, top_n=10):
    query_emb = embedder.encode([query])
    D, I = index.search(np.array(query_emb), top_n)
    results = []
    for idx in I[0]:
        results.append({'chunk': all_chunks[idx], 'meta': metadata[idx]})
    return results

# 5. Use Gemini to generate overview from top chunks
def gemini_overview(top_chunks, question, api_key):
    # Add document metadata summary for top 10 relevant documents
    doc_infos = []
    seen_pdfs = set()
    for c in top_chunks:
        meta = c['meta']
        pdf_id = meta['pdf']
        if pdf_id not in seen_pdfs:
            doc_infos.append(f"- Title: {meta.get('title','') or '[Unknown]'}\n  Author: {meta.get('author','') or '[Unknown]'}\n  Year: {meta.get('publication_year','') or '[Unknown]'}\n  File: {pdf_id}")
            seen_pdfs.add(pdf_id)
        if len(doc_infos) >= 10:
            break
    doc_info_str = "Top 10 relevant documents found:\n" + "\n".join(doc_infos) + "\n\n"
    context = "\n\n".join([f"From {c['meta']['pdf']} (chunk {c['meta']['chunk_idx']}): {c['chunk']}" for c in top_chunks])
    prompt = f"{doc_info_str}Context: {context}\n\nQuestion: {question}\nAnswer: "
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": api_key
    }
    data = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1500
        }
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    result = response.json()
    return result['candidates'][0]['content']['parts'][0]['text'].strip()

import http.server
import socketserver
import json

class MultiThesisRAGHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _send_json_response(self, data, status_code=200):
        response_json = json.dumps(data, indent=2)
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(response_json.encode('utf-8'))

    def _send_error_response(self, message, status_code=500):
        self._send_json_response({"error": message}, status_code)

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self.handle_health_check()
        else:
            self._send_error_response("Not found", 404)

    def do_POST(self):
        if self.path == '/search':
            self.handle_search()
        else:
            self._send_error_response("Not found", 404)

    def handle_health_check(self):
        try:
            total_docs = len(set([m['pdf'] for m in metadata])) if metadata else 0
            response = {
                "status": "healthy",
                "initialized": True,
                "total_documents": total_docs,
                "total_chunks": len(all_chunks)
            }
            self._send_json_response(response)
        except Exception as e:
            self._send_error_response(f"Health check failed: {str(e)}")

    def handle_search(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self._send_error_response("Invalid JSON", 400)
                return
            question = data.get('question', '').strip()
            if not question:
                self._send_error_response("No question provided", 400)
                return
            print(f"Processing search for: {question}")
            top_chunks = retrieve_top_chunks_hybrid(question, embedder, index, all_chunks, metadata, top_n=10, bm25=bm25, chroma_collection=chroma_collection)
            if not top_chunks:
                response = {
                    "overview": "No relevant documents found for your query.",
                    "documents": [],
                    "related_questions": []
                }
                self._send_json_response(response)
                return
            answer = prompt_chain(top_chunks, [question], api_key)
            documents = []
            seen_pdfs = set()
            for i, c in enumerate(top_chunks):
                meta = c['meta']
                pdf_id = meta['pdf']
                if pdf_id not in seen_pdfs:
                    documents.append({
                        "title": meta.get('title', '[Unknown]'),
                        "author": meta.get('author', '[Unknown]'),
                        "publication_year": meta.get('publication_year', '[Unknown]'),
                        "abstract": c['chunk'][:500] + "...",
                        "file": '',
                        "degree": 'Thesis',
                        "call_no": f"CALL-{i+1:03d}",
                        "disciplines": ['Research']
                    })
                    seen_pdfs.add(pdf_id)
            # Generate related questions (simple examples)
            related_questions = [
                f"What are the limitations of studies on {question.lower()}?",
                f"What methodology is commonly used to study {question.lower()}?",
                f"What are recent developments in research about {question.lower()}?",
                f"How do different studies compare regarding {question.lower()}?"
            ]
            response = {
                "overview": answer,
                "documents": documents,
                "related_questions": related_questions
            }
            self._send_json_response(response)
        except Exception as e:
            print(f"Error in search endpoint: {e}")
            self._send_error_response(f"Internal server error: {str(e)}")

# --- Initialization ---
if __name__ == "__main__":
    pdf_folder = os.path.join("RAG", "theses")
    api_key = os.getenv("GEMINI_API_KEY")
    print("Extracting and chunking PDFs...")
    all_chunks, metadata = extract_and_chunk_pdfs(pdf_folder)
    print(f"Total chunks: {len(all_chunks)}")
    if len(all_chunks) == 0:
        print("No text extracted from any PDFs. Exiting without calling LLM.")
        exit(1)
    print("Loading embedding model...")
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
    print("Embedding chunks...")
    chunk_embeddings = embed_chunks(all_chunks, embedder)
    print("Building FAISS index...")
    index = build_faiss_index(np.array(chunk_embeddings))
    print("Building ChromaDB index...")
    chroma_collection = build_chromadb_index(all_chunks, chunk_embeddings)
    print("Building BM25 index...")
    tokenized_chunks = [chunk.split() for chunk in all_chunks]
    bm25 = BM25Okapi(tokenized_chunks)

    # Start HTTP server
    port = 5000
    print(f"Starting Multi-Thesis RAG HTTP server on port {port}...")
    with socketserver.TCPServer(("", port), MultiThesisRAGHTTPRequestHandler) as httpd:
        print(f"Server started at http://localhost:{port}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.shutdown()