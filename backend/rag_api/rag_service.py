"""
RAG Service - Core logic extracted from multi_thesis_rag.py
This service handles all RAG operations including indexing, searching, and AI generation
"""

import os
import glob
import json
import numpy as np
import requests
import re
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
from django.conf import settings
import sys

# Add parent directory to path to import extract_metadata
sys.path.append(os.path.join(settings.BASE_DIR.parent, 'RAG'))
from extract_metadata import extract_thesis_metadata


class RAGService:
    """Singleton service for RAG operations"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def initialize(cls):
        """Initialize the RAG system (called on first search)"""
        if cls._initialized:
            return
        
        # Mark as initialized immediately to prevent duplicate calls
        cls._initialized = True
        
        instance = cls()
        print("[RAG] Initializing RAG system...")
        instance.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        instance.chroma_client = chromadb.PersistentClient(path=settings.RAG_CHROMADB_PATH)
        instance.collection = instance.chroma_client.get_or_create_collection("thesis_chunks")
        instance.api_key = settings.GEMINI_API_KEY
        
        # Check if ChromaDB already has data
        existing_chunks = instance.collection.count()
        print(f"[RAG] Found {existing_chunks} existing chunks in database")
        
        # Only index if database is empty
        if existing_chunks == 0:
            pdf_files = glob.glob(os.path.join(settings.RAG_THESES_FOLDER, '*.pdf'))
            txt_files = glob.glob(os.path.join(settings.RAG_THESES_FOLDER, '*.txt'))
            
            if len(pdf_files) > 0:
                print(f"[RAG] Found {len(pdf_files)} PDF files, extracting and indexing...")
                instance.extract_and_chunk_pdfs(settings.RAG_THESES_FOLDER)
            elif len(txt_files) > 0:
                print(f"[RAG] Found {len(txt_files)} TXT files (no PDFs), indexing directly...")
                instance.index_txt_files_directly(settings.RAG_THESES_FOLDER)
            else:
                print("[RAG] No PDF or TXT files found!")
            
            # Recovery if needed
            if instance.collection.count() == 0:
                print("[RAG] ChromaDB is empty. Attempting recovery...")
                instance.recover_chromadb_from_index(settings.RAG_THESES_FOLDER)
        else:
            print(f"[RAG] Skipping indexing - using existing {existing_chunks} chunks")
        
        print(f"[RAG] Ready! Total chunks: {instance.collection.count()}")
    
    def embed_chunks(self, chunks):
        """Convert text chunks to embeddings"""
        return np.array(self.embedder.encode(chunks, show_progress_bar=False, convert_to_numpy=True))
    
    def sentence_chunking(self, text, chunk_size=500):
        """Split text into overlapping chunks"""
        sentences = text.split('. ')
        sentences = [s.strip() + ('' if s.strip().endswith('.') else '.') for s in sentences if s.strip()]
        chunks = []
        overlap = int(chunk_size * 0.2)
        i = 0
        
        while i < len(sentences):
            window = []
            window_len = 0
            j = i
            
            while j < len(sentences) and window_len < chunk_size:
                sent = sentences[j]
                sent_len = len(sent.split())
                if window_len + sent_len > chunk_size and window:
                    break
                window.append(sent)
                window_len += sent_len
                j += 1
            
            if window:
                chunks.append(' '.join(window))
            
            if window_len == 0:
                i += 1
            else:
                step = max(1, window_len - overlap)
                words_seen = 0
                for k in range(i, len(sentences)):
                    words_seen += len(sentences[k].split())
                    if words_seen >= step:
                        i = k + 1
                        break
                else:
                    break
        
        return chunks
    
    def index_txt_files_directly(self, txt_folder, chunk_size=500):
        """Index TXT files directly without requiring PDF files"""
        indexed_path = os.path.join(txt_folder, "indexed_files.json")
        
        if os.path.exists(indexed_path):
            with open(indexed_path, "r", encoding="utf-8") as f:
                indexed_files = json.load(f)
        else:
            indexed_files = {}
        
        # Get all TXT files
        txt_files = glob.glob(os.path.join(txt_folder, '*.txt'))
        
        # Index new/changed files
        to_index = []
        for txt_path in txt_files:
            mtime = os.path.getmtime(txt_path)
            if txt_path not in indexed_files or indexed_files[txt_path] != mtime:
                to_index.append((txt_path, mtime))
        
        print(f"[RAG] Found {len(txt_files)} TXT files, {len(to_index)} need indexing")
        
        for txt_path, mtime in to_index:
            print(f"[RAG] Indexing: {os.path.basename(txt_path)}")
            
            try:
                with open(txt_path, "r", encoding="utf-8") as f:
                    text = f.read()
                
                meta = extract_thesis_metadata(text)
                meta["file"] = os.path.basename(txt_path)
                meta["university"] = meta.get("university", "")
                
                chunks = self.sentence_chunking(text, chunk_size=chunk_size)
                if not chunks:
                    print(f"[RAG] Skipping empty file: {os.path.basename(txt_path)}")
                    continue
                    
                chunk_embeddings = self.embed_chunks(chunks)
                
                chunk_metadatas = []
                for idx, chunk in enumerate(chunks):
                    meta_copy = dict(meta)
                    meta_copy["chunk_idx"] = idx
                    
                    if "subjects" in meta_copy and isinstance(meta_copy["subjects"], list):
                        meta_copy["subjects"] = ", ".join(str(s) for s in meta_copy["subjects"])
                    
                    for k, v in meta_copy.items():
                        if v is None:
                            meta_copy[k] = ""
                    
                    chunk_metadatas.append(meta_copy)
                
                ids = [f"{os.path.basename(txt_path)}_chunk_{i}" for i in range(len(chunks))]
                self.collection.add(
                    embeddings=[list(map(float, emb)) for emb in chunk_embeddings],
                    documents=chunks,
                    metadatas=chunk_metadatas,
                    ids=ids
                )
                
                indexed_files[txt_path] = mtime
                
            except Exception as e:
                print(f"[RAG] Failed to index {os.path.basename(txt_path)}: {e}")
                continue
        
        # Save indexed file registry
        with open(indexed_path, "w", encoding="utf-8") as f:
            json.dump(indexed_files, f)
        
        print(f"[RAG] Indexing complete. Total chunks: {self.collection.count()}")
    
    def extract_and_chunk_pdfs(self, pdf_folder, chunk_size=500):
        """Extract and index PDFs (only new/changed files)"""
        indexed_path = os.path.join(pdf_folder, "indexed_files.json")
        
        if os.path.exists(indexed_path):
            with open(indexed_path, "r", encoding="utf-8") as f:
                indexed_files = json.load(f)
        else:
            indexed_files = {}
        
        pdf_files = glob.glob(os.path.join(pdf_folder, '*.pdf'))
        txt_files = [os.path.splitext(p)[0] + ".txt" for p in pdf_files if os.path.exists(os.path.splitext(p)[0] + ".txt")]
        
        # Extract text from new PDFs
        for pdf_path in pdf_files:
            txt_path = os.path.splitext(pdf_path)[0] + ".txt"
            if not os.path.exists(txt_path):
                try:
                    reader = PdfReader(pdf_path)
                    text = "\n".join(page.extract_text() or "" for page in reader.pages)
                    
                    # Fallback to OCR if text is too short
                    if len(text.strip()) < 100:
                        try:
                            import pytesseract
                            from pdf2image import convert_from_path
                            images = convert_from_path(pdf_path)
                            text = "\n".join(pytesseract.image_to_string(img) for img in images)
                        except Exception as e:
                            print(f"[RAG] OCR failed for {os.path.basename(pdf_path)}: {e}")
                    
                    with open(txt_path, "w", encoding="utf-8") as f:
                        f.write(text)
                    print(f"[RAG] Extracted text for {os.path.basename(pdf_path)}")
                except Exception as e:
                    print(f"[RAG] Failed to extract {os.path.basename(pdf_path)}: {e}")
                    continue
        
        # Index new/changed files
        to_index = []
        for txt_path in txt_files:
            mtime = os.path.getmtime(txt_path)
            if txt_path not in indexed_files or indexed_files[txt_path] != mtime:
                to_index.append((txt_path, mtime))
        
        for txt_path, mtime in to_index:
            print(f"[RAG] Indexing: {os.path.basename(txt_path)}")
            
            with open(txt_path, "r", encoding="utf-8") as f:
                text = f.read()
            
            meta = extract_thesis_metadata(text)
            meta["file"] = os.path.basename(txt_path)
            meta["university"] = meta.get("university", "")
            
            chunks = self.sentence_chunking(text, chunk_size=chunk_size)
            chunk_embeddings = self.embed_chunks(chunks)
            
            chunk_metadatas = []
            for idx, chunk in enumerate(chunks):
                meta_copy = dict(meta)
                meta_copy["chunk_idx"] = idx
                
                if "subjects" in meta_copy and isinstance(meta_copy["subjects"], list):
                    meta_copy["subjects"] = ", ".join(str(s) for s in meta_copy["subjects"])
                
                for k, v in meta_copy.items():
                    if v is None:
                        meta_copy[k] = ""
                
                chunk_metadatas.append(meta_copy)
            
            ids = [f"{os.path.basename(txt_path)}_chunk_{i}" for i in range(len(chunks))]
            self.collection.add(
                embeddings=[list(map(float, emb)) for emb in chunk_embeddings],
                documents=chunks,
                metadatas=chunk_metadatas,
                ids=ids
            )
            
            indexed_files[txt_path] = mtime
        
        # Save updated index
        with open(indexed_path, "w", encoding="utf-8") as f:
            json.dump(indexed_files, f, indent=2)
        
        return len(to_index)
    
    def recover_chromadb_from_index(self, pdf_folder, chunk_size=500):
        """Recover ChromaDB from indexed_files.json"""
        indexed_path = os.path.join(pdf_folder, "indexed_files.json")
        
        if not os.path.exists(indexed_path):
            print("[RAG] No indexed_files.json found. Skipping recovery.")
            return 0
        
        with open(indexed_path, "r", encoding="utf-8") as f:
            indexed_files = json.load(f)
        
        if not indexed_files:
            print("[RAG] indexed_files.json is empty. Skipping recovery.")
            return 0
        
        recovered_chunks = 0
        for txt_path in indexed_files:
            if not os.path.exists(txt_path):
                continue
            
            with open(txt_path, "r", encoding="utf-8") as f:
                text = f.read()
            
            meta = extract_thesis_metadata(text)
            meta["file"] = os.path.basename(txt_path)
            meta["university"] = meta.get("university", "")
            
            chunks = self.sentence_chunking(text, chunk_size=chunk_size)
            chunk_embeddings = self.embed_chunks(chunks)
            
            chunk_metadatas = []
            for idx, chunk in enumerate(chunks):
                meta_copy = dict(meta)
                meta_copy["chunk_idx"] = idx
                
                if "subjects" in meta_copy and isinstance(meta_copy["subjects"], list):
                    meta_copy["subjects"] = ", ".join(str(s) for s in meta_copy["subjects"])
                
                for k, v in meta_copy.items():
                    if v is None:
                        meta_copy[k] = ""
                
                chunk_metadatas.append(meta_copy)
            
            ids = [f"{os.path.basename(txt_path)}_chunk_{i}" for i in range(len(chunks))]
            self.collection.add(
                embeddings=[list(map(float, emb)) for emb in chunk_embeddings],
                documents=chunks,
                metadatas=chunk_metadatas,
                ids=ids
            )
            
            recovered_chunks += len(chunks)
            print(f"[RAG] Recovered {os.path.basename(txt_path)} with {len(chunks)} chunks.")
        
        return recovered_chunks
    
    def search(self, question, top_n=50, distance_threshold=1.5):
        """Search for relevant thesis chunks"""
        query_emb = self.embedder.encode([question], convert_to_numpy=True)[0].tolist()
        
        results = self.collection.query(
            query_embeddings=[query_emb],
            n_results=top_n,
            include=["documents", "metadatas", "distances"]
        )
        
        top_chunks = []
        seen_files = set()
        documents = []
        
        for i in range(len(results["documents"][0])):
            meta = results["metadatas"][0][i]
            file_name = meta.get("file", meta.get("pdf", ""))
            score = float(results["distances"][0][i])
            
            top_chunks.append({
                "chunk": results["documents"][0][i],
                "meta": meta,
                "score": score
            })
            
            if score < distance_threshold and file_name and file_name not in seen_files:
                doc = {
                    "title": meta.get("title", "[Unknown Title]"),
                    "author": meta.get("author", "[Unknown Author]"),
                    "publication_year": meta.get("publication_year", "[Unknown Year]"),
                    "abstract": meta.get("abstract", ""),
                    "file": file_name,
                    "degree": meta.get("degree", "Thesis"),
                    "call_no": meta.get("call_no", ""),
                    "subjects": meta.get("subjects", ""),
                    "university": meta.get("university", "")
                }
                documents.append(doc)
                seen_files.add(file_name)
            
            if len(documents) >= 10:
                break
        
        return top_chunks, documents, distance_threshold
    
    def generate_overview(self, top_chunks, question, distance_threshold):
        """Generate AI overview using Gemini"""
        relevant_chunks = [c for c in top_chunks if c["score"] < distance_threshold]
        
        if not relevant_chunks:
            return "No relevant information found for your query."
        
        # Build context from up to 5 unique theses
        unique_files = []
        chunks_for_overview = []
        
        for c in relevant_chunks:
            file_name = c["meta"].get("file", c["meta"].get("pdf", ""))
            if file_name and file_name not in unique_files:
                unique_files.append(file_name)
            if file_name in unique_files[:5]:
                chunks_for_overview.append(c)
            if len(unique_files) >= 5:
                break
        
        if not self.api_key:
            return "No Gemini API key configured."
        
        try:
            return self._prompt_chain(chunks_for_overview, [question])
        except Exception as e:
            return f"[Gemini error: {e}]"
    
    def _prompt_chain(self, top_chunks, prompts):
        """Gemini prompt chain for multi-step reasoning"""
        if not top_chunks:
            return 'No results found for your query.'
        
        context = ""
        answer = ""
        
        for idx, prompt_text in enumerate(prompts):
            if idx == 0:
                # Build metadata summary
                doc_infos = []
                seen_pdfs = []
                pdf_to_number = {}
                
                for c in top_chunks:
                    meta = c['meta']
                    pdf_id = meta.get('pdf', meta.get('file', '[Unknown]'))
                    if pdf_id not in seen_pdfs:
                        seen_pdfs.append(pdf_id)
                        pdf_to_number[pdf_id] = len(seen_pdfs)
                        doc_infos.append(f"[{len(seen_pdfs)}] Title: {meta.get('title','') or '[Unknown]'}\n    Author: {meta.get('author','') or '[Unknown]'}\n    Year: {meta.get('publication_year','') or '[Unknown]'}\n    File: {pdf_id}")
                    if len(doc_infos) >= 10:
                        break
                
                doc_info_str = "Top 10 relevant documents found (numbered for reference):\n" + "\n".join(doc_infos) + "\n\n"
                
                chunk_context = "\n\n".join([
                    f"[{pdf_to_number[c['meta'].get('pdf', c['meta'].get('file', '[Unknown]'))]}] From {c['meta'].get('pdf', c['meta'].get('file', '[Unknown]'))} (chunk {c['meta']['chunk_idx']}): {c['chunk']}"
                    for c in top_chunks if c['meta'].get('pdf', c['meta'].get('file', '[Unknown]')) in pdf_to_number
                ])
                
                context = f"{doc_info_str}Context: {chunk_context}\n\nWhen answering, please reference the relevant thesis by its number in square brackets, e.g., [1], [2], etc., to indicate the source of each point.\n\n"
                context += (
                    "Synthesize the findings from the top 5 relevant theses in response to the following question. "
                    "Write a concise answer in EXACTLY 3 PARAGRAPHS using plain text, without bullet points, asterisks, or markdown formatting. "
                    "At the end of each paragraph, place in square brackets the number(s) of the most relevant thesis or theses that support that paragraph, e.g., [1] or [2][3]. "
                    "Do not place references anywhere else in the text. "
                    "Structure your answer as follows: "
                    "1) First paragraph: Introduce the main findings or key themes from the research. "
                    "2) Second paragraph: Discuss specific methods, results, or implications found across the theses. "
                    "3) Third paragraph: Conclude with a brief synthesis of overall insights. "
                    "After the third paragraph, concatenate all referenced thesis numbers in square brackets (e.g., [1][2][3][4][5]) with no additional text. "
                    "You must reference all top 5 unique theses at least once, distributing them across the 3 paragraphs. "
                )
            
            full_prompt = f"{context}Question: {prompt_text}\nAnswer: "
            
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
            headers = {
                "Content-Type": "application/json",
                "X-goog-api-key": self.api_key
            }
            data = {
                "contents": [{
                    "parts": [{"text": full_prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 1600
                }
            }
            
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            result = response.json()
            raw_answer = result['candidates'][0]['content']['parts'][0]['text'].strip()
            
            # Post-process answer (reference rearrangement logic)
            answer = self._process_answer_references(raw_answer, seen_pdfs, top_chunks)
        
        return answer
    
    def _process_answer_references(self, raw_answer, seen_pdfs, top_chunks):
        """Process and rearrange references in the answer"""
        ref_pattern = re.compile(r'\[(\d+)\]')
        
        # Find order of first appearance
        paragraphs = re.split(r'\n\s*\n', raw_answer)
        ref_order = []
        for para in paragraphs:
            for ref in ref_pattern.findall(para):
                if ref not in ref_order:
                    ref_order.append(ref)
        
        allowed_numbers = [str(n) for n in range(1, len(seen_pdfs)+1)]
        ref_order = [r for r in ref_order if r in allowed_numbers]
        
        for n in allowed_numbers:
            if n not in ref_order:
                ref_order.append(n)
        
        old_to_new = {old: str(i+1) for i, old in enumerate(ref_order)}
        
        def replace_refs(text):
            return ref_pattern.sub(lambda m: f"[{old_to_new.get(m.group(1), m.group(1))}]", text)
        
        raw_answer_new = replace_refs(raw_answer)
        
        # Move references to end of paragraphs
        def process_paragraphs(text):
            paragraphs = re.split(r'\n\s*\n', text)
            processed = []
            assigned_refs = []
            
            if paragraphs and ref_pattern.findall(paragraphs[-1]) and not re.search(r'[a-zA-Z]', paragraphs[-1]):
                paragraphs = paragraphs[:-1]
            
            n_body = max(1, len(paragraphs)-1)
            for i, para in enumerate(paragraphs):
                refs = ref_pattern.findall(para)
                unique_refs = []
                for r in refs:
                    if r not in unique_refs:
                        unique_refs.append(r)
                    if len(unique_refs) == 2:
                        break
                
                para_clean = ref_pattern.sub('', para).strip()
                para_clean = re.sub(r'\s+\.$', '.', para_clean)
                
                if i < n_body and unique_refs:
                    for r in unique_refs:
                        para_clean += f'[{r}]'
                        assigned_refs.append(r)
                
                processed.append(para_clean)
            
            if processed:
                summary_refs = []
                for r in assigned_refs:
                    if r not in summary_refs:
                        summary_refs.append(r)
                
                processed[-1] = re.sub(r'\s+\.$', '.', processed[-1])
                for r in summary_refs:
                    processed[-1] += f'[{r}]'
            
            return '\n\n'.join(processed)
        
        return process_paragraphs(raw_answer_new)
    
    def get_health_status(self):
        """Get system health information"""
        total_chunks = self.collection.count()
        
        try:
            all_meta = self.collection.get()["metadatas"]
            unique_pdfs = set(m.get("file", m.get("pdf", "")) for m in all_meta if m.get("file") or m.get("pdf"))
        except Exception:
            unique_pdfs = set()
        
        txt_files = glob.glob(os.path.join(settings.RAG_THESES_FOLDER, '*.txt'))
        
        return {
            "status": "healthy",
            "total_documents": len(unique_pdfs),
            "total_chunks": total_chunks,
            "total_txt_files": len(txt_files)
        }
