#!/usr/bin/env python
"""
Re-index ChromaDB with MPNet Model
===================================
This script re-indexes all thesis chunks using the new all-mpnet-base-v2 model.

The MPNet model produces 768-dimensional embeddings (vs 384 for MiniLM),
so the existing embeddings are incompatible and must be regenerated.

Run this script after switching to MPNet to rebuild the vector database.

Usage:
    cd backend
    python reindex_for_mpnet.py
"""

import os
import sys
import time

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'litpath_backend.settings')

import django
django.setup()

from rag_api.rag_service import RAGService


def main():
    print("=" * 60)
    print("REINDEXING CHROMADB FOR MPNET MODEL")
    print("=" * 60)
    print()
    
    # Reset singleton to force fresh initialization
    RAGService._instance = None
    RAGService._initialized = False
    
    # Initialize the service
    print("Initializing RAG service with MPNet model...")
    start = time.time()
    RAGService.initialize()
    rag = RAGService()
    
    print(f"Model loaded in {time.time() - start:.1f}s")
    print(f"Embedding dimensions: {rag.embedder.get_sentence_embedding_dimension()}")
    print()
    
    # Get current collection stats
    current_count = rag.collection.count()
    print(f"Current chunks in database: {current_count}")
    print()
    
    # Need to delete and re-index for dimension change
    if current_count > 0:
        print("WARNING: Database has existing embeddings!")
        print("These need to be deleted for the new MPNet dimensions (768 vs 384).")
        print()
        
        response = input("Delete and re-index all data? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            return
        
        # Delete the collection
        print("\nDeleting existing collection...")
        rag.chroma_client.delete_collection('thesis_chunks')
        print("Collection deleted.")
        
        # Reset and recreate
        RAGService._instance = None
        RAGService._initialized = False
        RAGService.initialize()
        rag = RAGService()
        print("Collection recreated.\n")
    
    # Path to thesis TXT files
    theses_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        '..', 'RAG', 'theses'
    )
    theses_dir = os.path.abspath(theses_dir)
    
    # Delete indexed_files.json to force re-index
    indexed_path = os.path.join(theses_dir, "indexed_files.json")
    if os.path.exists(indexed_path):
        os.remove(indexed_path)
        print("Cleared indexed_files.json to force full re-index")
    
    print()
    print("=" * 60)
    print("Starting re-indexing...")
    print("=" * 60)
    print()
    
    start_time = time.time()
    
    # Use the built-in indexing method
    rag.index_txt_files_directly(theses_dir, chunk_size=500)
    
    elapsed = time.time() - start_time
    print()
    print("=" * 60)
    print("REINDEXING COMPLETE")
    print("=" * 60)
    print(f"Total chunks: {rag.collection.count()}")
    print(f"Time: {elapsed:.1f}s ({elapsed/60:.1f} min)")
    print(f"Model: all-mpnet-base-v2 (768 dim)")
    print()


if __name__ == '__main__':
    main()
