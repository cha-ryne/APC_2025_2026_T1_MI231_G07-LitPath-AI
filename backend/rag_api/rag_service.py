"""
RAG Service - Core logic extracted from multi_thesis_rag.py
This service handles all RAG operations including indexing, searching, and AI generation
"""

import os
import glob
import json
import numpy as np
import requests
from google import genai
import re
import time
import hashlib
from functools import lru_cache
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
from django.conf import settings
import sys

# Import conversation manager
from .conversation_utils import conversation_manager


# ============= RESPONSE CACHE =============
# Simple in-memory cache for AI responses (avoids re-generating for repeated queries)
_response_cache = {}
_cache_max_size = 100  # Max cached responses


def get_cache_key(question, doc_ids):
    """Generate cache key from question and document IDs"""
    content = f"{question.lower().strip()}|{'|'.join(sorted(doc_ids))}"
    return hashlib.md5(content.encode()).hexdigest()


def get_cached_response(cache_key):
    """Get cached response if exists"""
    return _response_cache.get(cache_key)


def set_cached_response(cache_key, response):
    """Cache a response, evicting oldest if full"""
    global _response_cache
    if len(_response_cache) >= _cache_max_size:
        # Remove oldest entry (first key)
        oldest_key = next(iter(_response_cache))
        del _response_cache[oldest_key]
    _response_cache[cache_key] = response


# ============= FILIPINO TERM MAPPING =============
# Maps common Filipino/Tagalog terms to English equivalents
# Used for query expansion to improve Taglish search
FILIPINO_TERM_MAP = {
    # Agriculture
    'palay': 'rice paddy',
    'bigas': 'rice grain',
    'mais': 'corn maize',
    'gulay': 'vegetable',
    'prutas': 'fruit fruiting',
    'puno': 'tree',
    'halaman': 'plant crop',
    'bukid': 'farm field',
    'palayan': 'rice paddy',
    'ani': 'harvest yield',
    'tanim': 'planting cultivation',
    'pataba': 'fertilizer',
    'peste': 'pest insect',
    'sakit': 'disease pathogen',
    
    # Environment
    'tubig': 'water aquatic',
    'lupa': 'soil land',
    'hangin': 'air climate',
    'dagat': 'sea marine coastal',
    'ilog': 'river freshwater',
    'bundok': 'mountain forest',
    'kagubatan': 'forest woodland',
    'kalikasan': 'environment ecology',
    'klima': 'climate weather',
    'init': 'heat temperature',
    'asin': 'salt salinity',
    'alat': 'saline salinity',
    
    # Science terms
    'pag-aaral': 'study research',
    'pagsusuri': 'analysis examination',
    'sustansya': 'nutrition nutrient',
    'nutrisyon': 'nutrition nutrient',
    'pagkain': 'food diet',
    'kalusugan': 'health',
    'hayop': 'animal livestock',
    'isda': 'fish fishery',
    'ibon': 'bird avian',
    'insekto': 'insect pest',
    'bakterya': 'bacteria microbial',
    
    # Research terms
    'epekto': 'effect impact',
    'resulta': 'result findings',
    'paraan': 'method methodology',
    'katangian': 'characteristic property',
    'uri': 'type variety',
    'matibay': 'tolerant resistant',
    'mataas': 'high increased',
    'mababa': 'low decreased',
}

# ============= ENGLISH TECHNICAL TERM EXPANSION =============
# Expands English technical terms with synonyms for better recall
# Particularly useful for Taglish queries that already have English terms
ENGLISH_TERM_EXPANSION = {
    # Machine Learning / AI
    'machine learning': 'neural network deep learning prediction model algorithm',
    'artificial intelligence': 'AI machine learning neural network computational',
    'deep learning': 'neural network machine learning AI',
    'neural network': 'machine learning deep learning',
    
    # Agriculture
    'agriculture': 'farming crop cultivation agricultural farm',
    'crop': 'plant cultivation farming yield harvest',
    'yield': 'harvest production crop output',
    'fertilizer': 'nutrient soil amendment',
    'pesticide': 'pest control insecticide',
    
    # Research terms
    'salt stress': 'salinity tolerance saline NaCl sodium chloride',
    'stress tolerance': 'resistant abiotic stress tolerant',
    'drought': 'water stress dry arid',
    'growth regulators': 'hormone auxin gibberellin cytokinin PGR',
    'plant growth': 'development morphology physiology',
    
    # Quality/Food
    'quality': 'acceptability sensory characteristics',
    'nutritional': 'nutrient nutrition food composition',
    'food': 'diet nutrition dietary consumption',
}


def expand_query_with_filipino_terms(query):
    """
    Expand query by adding English equivalents for Filipino terms
    and synonyms for English technical terms.
    
    Args:
        query: Original search query
        
    Returns:
        Expanded query with additional terms
    """
    query_lower = query.lower()
    expanded_terms = []
    
    # First, expand Filipino terms
    for filipino_term, english_terms in FILIPINO_TERM_MAP.items():
        if filipino_term in query_lower:
            # Don't add if the English term is already in query
            for term in english_terms.split():
                if term not in query_lower:
                    expanded_terms.append(term)
    
    # Then, expand English technical terms (for Taglish queries)
    for english_term, synonyms in ENGLISH_TERM_EXPANSION.items():
        if english_term in query_lower:
            # Add synonyms that aren't already in the query
            for syn in synonyms.split():
                if syn.lower() not in query_lower:
                    expanded_terms.append(syn)
    
    if expanded_terms:
        # Limit expansion to avoid too much noise
        unique_terms = list(dict.fromkeys(expanded_terms))[:8]
        return query + ' ' + ' '.join(unique_terms)
    return query


# ============= RELEVANCE CHECK =============
# Stop words to ignore when checking keyword relevance
STOP_WORDS = {
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'of', 'in', 'to', 'for', 'with', 'on', 'at',
    'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
    'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'am', 'if', 'it', 'its', 'about', 'find', 'research', 'study', 'studies', 'thesis',
    'theses', 'paper', 'papers', 'work', 'works', 'effect', 'effects', 'impact', 'impacts',
    'affect', 'affects', 'use', 'using', 'used', 'based', 'related', 'show', 'shows'
}


def extract_query_keywords(query):
    """
    Extract meaningful keywords from a query, removing stop words.
    
    Args:
        query: User's search query
        
    Returns:
        Set of meaningful keywords (lowercase)
    """
    # Remove punctuation and split
    import re
    words = re.findall(r'\b[a-zA-Z]{3,}\b', query.lower())
    
    # Filter out stop words and very short words
    keywords = {w for w in words if w not in STOP_WORDS and len(w) >= 3}
    
    return keywords


import difflib
import re

def check_content_relevance(query, chunks, min_keyword_match_ratio=0.3):
    """
    Check if retrieved chunks contain relevant content, allowing for slight misspellings.
    """
    if not chunks:
        return {
            'is_relevant': False,
            'matched_keywords': set(),
            'missing_keywords': set(),
            'match_ratio': 0.0,
            'chunk_topics': []
        }

    # Extract keywords from query
    query_keywords = extract_query_keywords(query)

    if not query_keywords:
        return {
            'is_relevant': True,
            'matched_keywords': set(),
            'missing_keywords': set(),
            'match_ratio': 1.0,
            'chunk_topics': []
        }

    # Combine all chunk text
    all_chunk_text = ' '.join([c.get('chunk', '') for c in chunks]).lower()
    all_metadata_text = ' '.join([
        c.get('meta', {}).get('title', '') + ' ' + 
        c.get('meta', {}).get('subjects', '') 
        for c in chunks
    ]).lower()

    combined_text = all_chunk_text + ' ' + all_metadata_text

    # Pre-tokenize the text for faster fuzzy matching
    text_tokens = set(re.findall(r'\b\w{3,}\b', combined_text))

    matched_keywords = set()

    for kw in query_keywords:
        # 1. Exact match (Fastest)
        if kw in combined_text:
            matched_keywords.add(kw)
            continue
        # 2. Fuzzy match (Slower but handles typos)
        matches = difflib.get_close_matches(kw, text_tokens, n=1, cutoff=0.80)
        if matches:
            matched_keywords.add(kw)

    missing_keywords = query_keywords - matched_keywords
    match_ratio = len(matched_keywords) / len(query_keywords) if query_keywords else 0

    # Extract topics (keep existing logic)
    chunk_topics = []
    seen_topics = set()
    for c in chunks:
        meta = c.get('meta', {})
        subjects = meta.get('subjects', '')
        if subjects and subjects not in seen_topics:
            seen_topics.add(subjects)
            chunk_topics.append(subjects)

    return {
        'is_relevant': match_ratio >= min_keyword_match_ratio,
        'matched_keywords': matched_keywords,
        'missing_keywords': missing_keywords,
        'match_ratio': match_ratio,
        'chunk_topics': chunk_topics[:5]
    }


def format_metadata_capitalization(text, field_type='default'):
    """Format metadata text with proper capitalization - only fixes ALL CAPS text
    
    Args:
        text: The text to format
        field_type: Type of field - 'author', 'title', 'university', 'degree', or 'default'
    """
    if not text or text in ['[Unknown]', '[Unknown Author]', '[Unknown Title]']:
        return text
    
    # Helper to convert to title case with lowercase articles/prepositions
    def smart_title_case(s):
        lowercase_words = ['of', 'the', 'and', 'in', 'at', 'to', 'for', 'a', 'an', 'with', 'on', 'by']
        # Compound name prefixes that should be capitalized
        compound_prefixes = ['de', 'del', 'dela', 'de la', 'van', 'von', 'da', 'san', 'santa', 'mc', 'mac']
        # Common credentials that should stay uppercase
        credentials = ['rnd', 'phd', 'md', 'dvm', 'ms', 'ma', 'bs', 'ba', 'jr', 'sr', 'ii', 'iii', 'iv']
        
        words = s.split()
        result = []
        for i, word in enumerate(words):
            word_lower = word.lower()
            
            # Check if it's a credential (preserve uppercase)
            if word_lower in credentials:
                result.append(word.upper())
            # Handle hyphenated words (e.g., Campañano-Bernardo)
            elif '-' in word:
                parts = word.split('-')
                capitalized_parts = [part.capitalize() for part in parts]
                result.append('-'.join(capitalized_parts))
            # Handle compound name prefixes (De, Del, Van, etc.)
            elif i > 0 and word_lower in compound_prefixes:
                result.append(word.capitalize())
            # Always capitalize first word
            elif i == 0 or word_lower not in lowercase_words:
                result.append(word.capitalize())
            else:
                result.append(word.lower())
        return ' '.join(result)
    
    # Only convert ALL CAPS text to proper case
    if text.isupper():
        return smart_title_case(text)
    
    # Otherwise return original text (already properly formatted)
    return text.strip()

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
        cls._initialized = True
        instance = cls()
        print("[RAG] Initializing RAG system...")
        instance.embedder = SentenceTransformer('all-mpnet-base-v2')
        print("[RAG] Loaded embedding model: all-mpnet-base-v2")
        instance.chroma_client = chromadb.PersistentClient(path=settings.RAG_CHROMADB_PATH)
        instance.collection = instance.chroma_client.get_or_create_collection("thesis_chunks")
        instance.api_key = settings.GEMINI_API_KEY
        existing_chunks = instance.collection.count()
        print(f"[RAG] Found {existing_chunks} existing chunks in database")
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
            if instance.collection.count() == 0:
                print("[RAG] ChromaDB is empty. Attempting recovery...")
                instance.recover_chromadb_from_index(settings.RAG_THESES_FOLDER)
        else:
            print(f"[RAG] Skipping indexing - using existing {existing_chunks} chunks")
        print(f"[RAG] Ready! Total chunks: {instance.collection.count()}")
    
    def index_txt_files_directly(self, txt_folder, chunk_size=500):
        """Index TXT files directly without requiring PDF files (batch embedding)"""
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

                # Batch embed all chunks at once
                chunk_embeddings = self.embedder.encode(chunks, batch_size=32, show_progress_bar=False, convert_to_numpy=True)

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
        """Extract and index PDFs (only new/changed files, batch embedding)"""
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
            if not chunks:
                print(f"[RAG] Skipping empty file: {os.path.basename(txt_path)}")
                continue

            # Batch embed all chunks at once
            chunk_embeddings = self.embedder.encode(chunks, batch_size=32, show_progress_bar=False, convert_to_numpy=True)

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
    
    def search(self, question, top_n=200, distance_threshold=1.5, subjects=None, year=None, year_start=None, year_end=None, rerank_top_k=50):
        """Search for relevant thesis chunks with optional metadata filters, LLM-based query rewriting, and local reranker."""
        # Step 1: LLM-based query rewriting (Gemini)
        rewritten_question = None
        if self.api_key:
            try:
                client = genai.Client(api_key=self.api_key)
                rewrite_prompt = (
                    f"Rewrite the following academic search query to be more clear, specific, and in standard English. "
                    f"If the query is in Tagalog, Taglish, Cebuano, or any Philippine language or dialect, translate and clarify it for a research database search. "
                    f"Correct minor typographical errors or spelling mistakes in the query, no matter the language. "
                    f"If the query is already good and understandable in English, do not rewrite it and just return it as is. "
                    f"Do not answer the question, just rewrite it.\n\nQuery: {question}\n\nRewritten query:"
                )
                response = client.models.generate_content(
                    model="gemini-2.5-flash-lite",
                    contents=rewrite_prompt,
                    config={
                        "temperature": 0.2,
                        "max_output_tokens": 128,
                        "top_p": 0.8,
                        "thinking_config": {"thinking_budget": 0},
                    }
                )
                if hasattr(response, "text") and response.text.strip():
                    rewritten_question = response.text.strip()
                    print(f"[RAG] LLM query rewrite: '{question}' -> '{rewritten_question}'")
            except Exception as e:
                print(f"[RAG] Query rewriting failed: {e}")
        if not rewritten_question:
            rewritten_question = question

        # Step 2: Expand query with Filipino/English term mappings
        expanded_question = expand_query_with_filipino_terms(rewritten_question)
        if expanded_question != rewritten_question:
            print(f"[RAG] Query expanded: '{rewritten_question}' -> '{expanded_question}'")

        query_emb = self.embedder.encode([expanded_question], convert_to_numpy=True)[0].tolist()

        # Build ChromaDB where clause for year filters
        filters = []
        if year:
            filters.append({"publication_year": {"$eq": str(year)}})
        if year_start:
            filters.append({"publication_year": {"$gte": str(year_start)}})
        if year_end:
            filters.append({"publication_year": {"$lte": str(year_end)}})

        where_clause = {"$and": filters} if len(filters) > 1 else (filters[0] if filters else None)

        # Query with database-level year filtering
        results = self.collection.query(
            query_embeddings=[query_emb],
            n_results=top_n,
            where=where_clause,
            include=["documents", "metadatas", "distances"]
        )

        # Collect candidate chunks (vector search)
        candidate_chunks = []
        for i in range(len(results["documents"][0])):
            meta = results["metadatas"][0][i]
            file_name = meta.get("file", meta.get("pdf", ""))
            score = float(results["distances"][0][i])
            if score < distance_threshold and file_name:
                # Apply subject filter (OR logic - match any)
                if subjects and len(subjects) > 0:
                    subjects_str = meta.get("subjects", "")
                    doc_subjects = [s.strip() for s in subjects_str.split(",")]
                    match_found = False
                    for requested_subj in subjects:
                        for doc_subj in doc_subjects:
                            if requested_subj.lower() == doc_subj.lower():
                                match_found = True
                                break
                        if match_found:
                            break
                    if not match_found:
                        continue
                candidate_chunks.append({
                    "chunk": results["documents"][0][i],
                    "meta": meta,
                    "score": score
                })

        # === Reranker step using local LLM API (Qwen or similar) for semantic selection ===
        ai_base_url = os.environ.get("AI_BASE_URL", "http://localhost:1234/v1")
        ai_api_key = os.environ.get("AI_API_KEY", "localhost")
        ai_model = os.environ.get("AI_MODEL", "qwen/qwen3-4b-2507")

        # Limit rerank candidates and chunk size to fit LLM context window
        max_rerank_candidates = min(rerank_top_k, 30)  # hard cap for LLM context
        max_chunk_chars = 350  # truncate each chunk for prompt
        rerank_candidates = candidate_chunks[:max_rerank_candidates]
        selected_indices = []
        debug_prompt = None
        if rerank_candidates:
            try:
                debug_prompt = (
                    "You are a document selector for academic search. "
                    "Given a user query and a list of document chunks, select the most relevant chunks (up to 10) that best answer the query. "
                    "Return a JSON list of the indices (starting from 1) of the selected chunks, in order of relevance. "
                    "Do not answer the query or summarize, just return the list."
                )
                user_content = (
                    f"Query: {expanded_question}\n\n" +
                    "Document Chunks:\n" +
                    "\n".join([
                        f"[{i+1}] " + c['chunk'][:max_chunk_chars].replace('\n', ' ').replace('  ', ' ')
                        for i, c in enumerate(rerank_candidates)
                    ])
                )
                payload = {
                    "model": ai_model,
                    "messages": [
                        {"role": "system", "content": debug_prompt},
                        {"role": "user", "content": user_content}
                    ]
                }
                headers = {"Authorization": f"Bearer {ai_api_key}", "Content-Type": "application/json"}
                print("[RAG] Reranker prompt sent to LLM:\n", debug_prompt)
                print("[RAG] Reranker user content:\n", user_content[:1000], "..." if len(user_content) > 1000 else "")
                response = requests.post(f"{ai_base_url}/chat/completions", json=payload, headers=headers, timeout=5000)
                response.raise_for_status()
                result = response.json()
                import ast
                import re
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                print("[RAG] Reranker LLM raw response:", content)
                # Robustly extract the first list of integers from the response
                match = re.search(r'\[\s*\d+(?:\s*,\s*\d+)*\s*\]', content)
                if match:
                    try:
                        selected_indices = ast.literal_eval(match.group(0))
                        if not isinstance(selected_indices, list):
                            selected_indices = []
                        # Only keep valid integer indices
                        selected_indices = [i for i in selected_indices if isinstance(i, int)]
                    except Exception as parse_e:
                        print(f"[RAG] Failed to parse LLM indices: {parse_e}")
                        selected_indices = []
                else:
                    # Try to extract all numbers in brackets as fallback
                    numbers = re.findall(r'\[(.*?)\]', content)
                    if numbers:
                        try:
                            nums = numbers[0].split(',')
                            selected_indices = [int(n.strip()) for n in nums if n.strip().isdigit()]
                        except Exception as fallback_e:
                            print(f"[RAG] Fallback parse failed: {fallback_e}")
                            selected_indices = []
                    else:
                        selected_indices = []
            except Exception as e:
                print(f"[RAG] Local reranker failed: {e}")
                selected_indices = []
        else:
            selected_indices = []

        # Select chunks based on LLM indices (1-based) with robust error handling
        selected_chunks = []
        try:
            for idx in selected_indices:
                if isinstance(idx, int) and 1 <= idx <= len(rerank_candidates):
                    selected_chunks.append(rerank_candidates[idx-1])
                else:
                    print(f"[RAG] Ignoring out-of-range LLM index: {idx}")
        except Exception as e:
            import traceback
            print(f"[RAG] Exception during LLM index selection: {e}\n{traceback.format_exc()}")
            selected_chunks = []

        # If LLM fails or returns nothing, fallback to top by distance
        if not selected_chunks:
            print("[RAG] Reranker fallback: using top by distance")
            selected_chunks = rerank_candidates[:10]

        # Prepare documents and top_chunks for output
        top_chunks = []
        documents = []
        seen_titles = set()
        for c in selected_chunks:
            meta = c["meta"]
            file_name = meta.get("file", meta.get("pdf", ""))
            # Fix degree: prefer meta['degree'], fallback to meta['degree_name'], fallback to 'Thesis'
            degree = meta.get("degree") or meta.get("degree_name") or "Thesis"
            degree = format_metadata_capitalization(degree, field_type='degree')
            # Fix subjects: join list if needed, clean up
            subjects = meta.get("subjects", "")
            if isinstance(subjects, list):
                subjects = ", ".join(str(s) for s in subjects)
            subjects = str(subjects).strip()
            author = format_metadata_capitalization(
                meta.get("author", "[Unknown Author]"), 
                field_type='author'
            )
            title = format_metadata_capitalization(
                meta.get("title", "[Unknown Title]"),
                field_type='title'
            )
            university = format_metadata_capitalization(
                meta.get("university", ""),
                field_type='university'
            )
            # Only add one chunk per unique title
            if title in seen_titles:
                continue
            seen_titles.add(title)
            doc = {
                "title": title,
                "author": author,
                "publication_year": meta.get("publication_year", ""),
                "abstract": meta.get("abstract", ""),
                "file": file_name,
                "degree": degree,
                "call_no": meta.get("call_no", ""),
                "subjects": subjects,
                "university": university,
                "school": university
            }
            documents.append(doc)
            top_chunks.append(c)

        return top_chunks, documents, distance_threshold
    
    def get_available_filters(self):
        """Get available subjects and years from the database for filtering UI"""
        try:
            # Get all unique metadatas to extract subjects and years
            all_results = self.collection.get(
                include=["metadatas"]
            )
            
            subjects_set = set()
            years_set = set()
            
            for meta in all_results["metadatas"]:
                # Extract subjects
                subjects_str = meta.get("subjects", "")
                if subjects_str:
                    # Split by comma and clean up
                    subject_list = [s.strip() for s in subjects_str.split(",")]
                    subjects_set.update(subject_list)
                
                # Extract year
                year = meta.get("publication_year", "")
                if year and year != "[Unknown Year]":
                    years_set.add(year)
            
            # Sort and return
            return {
                "subjects": sorted(list(subjects_set)),
                "years": sorted(list(years_set), reverse=True)  # Most recent first
            }
        except Exception as e:
            print(f"[RAG] Error getting filters: {e}")
            return {"subjects": [], "years": []}
    
    def generate_overview(self, top_chunks, question, distance_threshold, conversation_history=None, relevance_info=None):
        """Always generate AI overview using context-aware method with conversation context and improved prompt."""
        # Filter relevant chunks by distance threshold if available
        relevant_chunks = [c for c in top_chunks if c.get("score", 0) < distance_threshold] if top_chunks and "score" in top_chunks[0] else top_chunks
        if not relevant_chunks:
            return "No relevant information found for your query."
        # Optionally check content relevance (reuse previous logic if needed)
        relevance_check = check_content_relevance(question, relevant_chunks, min_keyword_match_ratio=0.25)
        print(f"[RAG] Relevance check: {relevance_check['match_ratio']:.0%} keyword match")
        print(f"[RAG] Matched: {relevance_check['matched_keywords']}")
        print(f"[RAG] Missing: {relevance_check['missing_keywords']}")
        # If very low relevance, skip LLM and return a helpful message
        if not relevance_check['is_relevant'] and relevance_check['match_ratio'] < 0.15:
            missing = ', '.join(list(relevance_check['missing_keywords'])[:5])
            return (
                f"No relevant information was found in the thesis database for your query. "
                f"The search terms '{missing}' do not appear in any available documents. "
                f"Try using different keywords, checking for spelling errors, or searching for related academic topics."
            )
        # Use the context-aware overview method for all cases
        return self._generate_with_context(relevant_chunks, question, conversation_history, relevance_info)
    
    def _generate_with_context(self, top_chunks, question, conversation_history=None, relevance_info=None):
        """Generate AI overview with conversation context for follow-up questions"""
        if not top_chunks:
            return 'No results found for your query.'
        
        # Build document metadata summary
        doc_infos = []
        seen_pdfs = []
        pdf_to_number = {}
        
        for c in top_chunks:
            meta = c['meta']
            pdf_id = meta.get('pdf', meta.get('file', '[Unknown]'))
            if pdf_id not in seen_pdfs:
                seen_pdfs.append(pdf_id)
                pdf_to_number[pdf_id] = len(seen_pdfs)
                doc_infos.append(
                    f"[{len(seen_pdfs)}] {meta.get('title','') or '[Unknown]'} "
                    f"({meta.get('publication_year','') or 'N/A'}) "
                    f"by {meta.get('author','') or '[Unknown]'}"
                )
            if len(doc_infos) >= 10:
                break
        
        # Build chunk context with citations
        chunk_context = "\n\n".join([
            f"[{pdf_to_number[c['meta'].get('pdf', c['meta'].get('file', '[Unknown]'))]}] "
            f"{c['chunk'][:1500]}"  # Limit chunk size for speed
            for c in top_chunks if c['meta'].get('pdf', c['meta'].get('file', '[Unknown]')) in pdf_to_number
        ])
        
        # Build conversation history context (if any)
        history_context = ""
        if conversation_history and len(conversation_history) > 0:
            history_parts = []
            for i, turn in enumerate(conversation_history[-3:], 1):  # Last 3 turns max
                q = turn.get('query', '')
                # Truncate previous answers to save tokens
                a = turn.get('overview', '')[:500]
                if a and len(turn.get('overview', '')) > 500:
                    a += "..."
                history_parts.append(f"User asked: {q}\nYou answered: {a}")
            
            history_context = (
                "\n\nPREVIOUS CONVERSATION:\n"
                + "\n---\n".join(history_parts)
                + "\n\nThe user is now asking a follow-up question. Use the conversation context to understand references like 'it', 'this', 'that', 'compare', etc.\n"
            )
        
        # Add relevance warning if content might not fully answer the question
        relevance_warning = ""
        if relevance_info and relevance_info.get('match_ratio', 1.0) < 0.5:
            missing = ', '.join(list(relevance_info.get('missing_keywords', set()))[:5])
            matched = ', '.join(list(relevance_info.get('matched_keywords', set()))[:5])
            relevance_warning = f"""
RELEVANCE NOTE: The sources may not fully address the user's question.
- Keywords from query found in sources: {matched if matched else 'few/none'}
- Keywords from query NOT found in sources: {missing if missing else 'none'}
- If sources don't contain relevant information, clearly state this limitation.
"""
        
        # Construct the full prompt
        prompt = f"""You are an academic research assistant analyzing thesis documents.

AVAILABLE SOURCES:
{chr(10).join(doc_infos)}

CONTEXT FROM SOURCES:
{chunk_context}{history_context}{relevance_warning}
USER QUESTION: {question}

INSTRUCTIONS:
- First, assess if the provided source content directly addresses the user's question
- If sources DO contain relevant information:
  * Synthesize findings from the provided sources to answer the question
  * Write 2-4 clear paragraphs (adjust length based on complexity)
  * Cite sources at the END of each sentence using [1], [2], etc. - NEVER place citations in the middle of a sentence
  * When citing multiple sources for the same claim, list them separately like [1] [2], not [1, 2]
  * Only state what the sources explicitly say - do not infer or extrapolate

- If sources DO NOT directly answer the question:
  * Start with: "The available sources do not directly address your specific question about [topic]."
  * Then explain what topics/themes the sources DO cover that might be related
  * Suggest how the user might refine their search to find more relevant results
  * Still cite the sources when mentioning what they contain
  * Do NOT fabricate information that isn't in the sources

Answer:"""
        
        # Call Gemini API
        client = genai.Client(api_key=self.api_key)
        
        print(f"DEBUG: Generating with conversation context ({len(conversation_history or [])} previous turns)")
        print(f"DEBUG: Prompt length: {len(prompt)} characters")
        
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt,
                config={
                    "temperature": 0.3,
                    "max_output_tokens": 2048,
                    "top_p": 0.9,
                    "thinking_config": {"thinking_budget": 0},
                }
            )
        except Exception as e:
            print(f"FAILED. Error details: {e}")
            raise
        
        # Check for issues with the response
        if not response.candidates:
            print("WARNING: No candidates in response")
            return "Unable to generate overview. Please try again."
        
        candidate = response.candidates[0]
        finish_reason = getattr(candidate, 'finish_reason', None)
        print(f"DEBUG: Finish reason: {finish_reason}")
        
        # Get the text content safely
        try:
            raw_answer = response.text.strip()
        except Exception as text_error:
            print(f"WARNING: Could not get response text: {text_error}")
            if candidate.content and candidate.content.parts:
                raw_answer = "".join(part.text for part in candidate.content.parts if hasattr(part, 'text')).strip()
            else:
                return "Unable to generate overview. The model returned an incomplete response."
        
        print(f"DEBUG: Response length: {len(raw_answer)} characters")
        
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
        
        processed_answer = process_paragraphs(raw_answer_new)
        
        # Fix spacing issues: remove spaces before punctuation
        processed_answer = re.sub(r'\s+([,.])', r'\1', processed_answer)
        # Fix multiple spaces
        processed_answer = re.sub(r'  +', ' ', processed_answer)
        
        return processed_answer
    
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
    
    def calculate_search_metrics(self, top_chunks, distance_threshold=1.5):
        """
        Calculate search accuracy metrics based on distance scores.
        
        Args:
            top_chunks: List of chunks with scores from search
            distance_threshold: The relevance threshold used
            
        Returns:
            Dictionary with search quality metrics
        """
        if not top_chunks:
            return {
                "documents_returned": 0,
                "avg_distance": None,
                "min_distance": None,
                "max_distance": None,
                "high_relevance_count": 0,
                "moderate_relevance_count": 0,
                "relevance_distribution": {
                    "very_high": 0,  # 0.0 - 0.5
                    "high": 0,       # 0.5 - 1.0
                    "moderate": 0    # 1.0 - 1.5
                }
            }
        
        scores = [c["score"] for c in top_chunks]
        
        # Calculate distribution
        very_high = sum(1 for s in scores if s < 0.5)
        high = sum(1 for s in scores if 0.5 <= s < 1.0)
        moderate = sum(1 for s in scores if 1.0 <= s < distance_threshold)
        
        return {
            "documents_returned": len(scores),
            "avg_distance": round(sum(scores) / len(scores), 4),
            "min_distance": round(min(scores), 4),
            "max_distance": round(max(scores), 4),
            "high_relevance_count": very_high + high,  # distance < 1.0
            "moderate_relevance_count": moderate,       # 1.0 <= distance < 1.5
            "relevance_distribution": {
                "very_high": very_high,   # 0.0 - 0.5
                "high": high,             # 0.5 - 1.0
                "moderate": moderate      # 1.0 - 1.5
            }
        }
    
    def verify_citations(self, overview, top_chunks):
        """
        Verify that citations in the AI overview are grounded in source documents.
        
        Checks keyword overlap between paragraphs and their cited sources.
        
        Args:
            overview: The AI-generated overview text
            top_chunks: List of source chunks used for generation
            
        Returns:
            Dictionary with citation verification metrics
        """
        if not overview or not top_chunks:
            return {
                "total_citations": 0,
                "verified_citations": 0,
                "verification_rate": 0.0,
                "details": []
            }
        
        # Build mapping of citation numbers to source content
        seen_files = []
        file_to_number = {}
        source_content = {}
        
        for c in top_chunks:
            file_name = c["meta"].get("file", c["meta"].get("pdf", "[Unknown]"))
            if file_name not in seen_files:
                seen_files.append(file_name)
                num = len(seen_files)
                file_to_number[file_name] = num
                source_content[str(num)] = {
                    "chunk": c["chunk"].lower(),
                    "title": c["meta"].get("title", "").lower(),
                    "abstract": c["meta"].get("abstract", "").lower(),
                    "file": file_name
                }
            if len(seen_files) >= 5:
                break
        
        # Extract citations from overview
        ref_pattern = re.compile(r'\[(\d+)\]')
        
        # Split into paragraphs and analyze each
        paragraphs = [p.strip() for p in overview.split('\n\n') if p.strip()]
        
        verification_details = []
        total_citations = 0
        verified_citations = 0
        
        for para_idx, para in enumerate(paragraphs):
            # Find citations in this paragraph
            citations = ref_pattern.findall(para)
            para_text = ref_pattern.sub('', para).lower()
            para_words = set(para_text.split())
            
            # Remove common stop words for better matching
            stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 
                         'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                         'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                         'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
                         'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
                         'through', 'during', 'before', 'after', 'above', 'below',
                         'between', 'under', 'again', 'further', 'then', 'once',
                         'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either',
                         'neither', 'not', 'only', 'own', 'same', 'than', 'too',
                         'very', 'just', 'also', 'now', 'here', 'there', 'when',
                         'where', 'why', 'how', 'all', 'each', 'every', 'both',
                         'few', 'more', 'most', 'other', 'some', 'such', 'no',
                         'any', 'this', 'that', 'these', 'those', 'it', 'its'}
            
            para_keywords = para_words - stop_words
            
            for cite_num in citations:
                total_citations += 1
                
                if cite_num in source_content:
                    source = source_content[cite_num]
                    source_text = source["chunk"] + " " + source["title"] + " " + source["abstract"]
                    source_words = set(source_text.split()) - stop_words
                    
                    # Calculate keyword overlap
                    if para_keywords and source_words:
                        overlap = para_keywords & source_words
                        overlap_ratio = len(overlap) / len(para_keywords) if para_keywords else 0
                        
                        # Consider verified if at least 15% keyword overlap
                        is_verified = overlap_ratio >= 0.15
                        if is_verified:
                            verified_citations += 1
                        
                        verification_details.append({
                            "paragraph": para_idx + 1,
                            "citation": cite_num,
                            "source_file": source["file"],
                            "overlap_ratio": round(overlap_ratio, 4),
                            "overlapping_keywords": len(overlap),
                            "verified": is_verified
                        })
                    else:
                        verification_details.append({
                            "paragraph": para_idx + 1,
                            "citation": cite_num,
                            "source_file": source["file"],
                            "overlap_ratio": 0,
                            "overlapping_keywords": 0,
                            "verified": False
                        })
                else:
                    # Citation number not found in sources
                    verification_details.append({
                        "paragraph": para_idx + 1,
                        "citation": cite_num,
                        "source_file": None,
                        "overlap_ratio": 0,
                        "overlapping_keywords": 0,
                        "verified": False,
                        "error": "Citation number not found in sources"
                    })
        
        verification_rate = (verified_citations / total_citations * 100) if total_citations > 0 else 0.0
        
        return {
            "total_citations": total_citations,
            "verified_citations": verified_citations,
            "verification_rate": round(verification_rate, 2),
            "details": verification_details
        }



    def get_document_metadata(self, file_path):
        """
        Get metadata for a specific document by its file path.
        
        Args:
            file_path (str): The file path of the document
            
        Returns:
            dict: Document metadata including title, author, year, etc., or None if not found
        """
        try:
            # Query ChromaDB for chunks from this specific file
            results = self.collection.get(
                where={"file": file_path},
                limit=1,  # We only need one chunk to get the metadata
                include=["metadatas"]
            )
            
            if results and results["metadatas"] and len(results["metadatas"]) > 0:
                meta = results["metadatas"][0]
                
                # Format metadata with proper capitalization
                author = format_metadata_capitalization(
                    meta.get("author", "[Unknown Author]"), 
                    field_type='author'
                )
                title = format_metadata_capitalization(
                    meta.get("title", "[Unknown Title]"),
                    field_type='title'
                )
                university = format_metadata_capitalization(
                    meta.get("university", "Unknown University"),
                    field_type='university'
                )
                degree = format_metadata_capitalization(
                    meta.get("degree", "Thesis"),
                    field_type='degree'
                )
                
                return {
                    "title": title,
                    "author": author,
                    "year": meta.get("publication_year", "N/A"),
                    "abstract": meta.get("abstract", "No abstract available"),
                    "file": file_path,
                    "degree": degree,
                    "subjects": meta.get("subjects", ""),
                    "school": university,
                    "university": university,
                    "call_no": meta.get("call_no", "")
                }
            else:
                print(f"No metadata found for {file_path}")
                return None
                
        except Exception as e:
            print(f"Error getting metadata for {file_path}: {str(e)}")
            return None
