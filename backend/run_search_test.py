# -*- coding: utf-8 -*-
"""
Search-Only Test with Expanded Ground Truth (No Gemini API calls)
Tests search quality across English, Tagalog, and Taglish queries
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'litpath_backend.settings')

import django
django.setup()

from rag_api.rag_service import RAGService
from rag_api.accuracy_metrics import AccuracyMetrics

# Import expanded test queries from benchmark
from run_benchmark import TEST_QUERIES

def run_search_test():
    print("=" * 70)
    print("LitPath AI - Search Test with Expanded Ground Truth")
    print("=" * 70)
    
    print("\n[INIT] Initializing RAG Service...")
    RAGService.initialize()
    rag = RAGService()
    metrics = AccuracyMetrics()
    
    results_by_lang = {"english": [], "tagalog": [], "taglish": []}
    precision_by_lang = {"english": [], "tagalog": [], "taglish": []}
    recall_by_lang = {"english": [], "tagalog": [], "taglish": []}
    
    for test in TEST_QUERIES:
        if test['category'] == 'no_results':
            continue
            
        lang = test['language']
        print(f"\n[{lang.upper()}] Query {test['id']}: {test['query'][:50]}...")
        print(f"  Ground Truth: {len(test['relevant_docs'])} relevant docs")
        
        try:
            top_chunks, documents, _ = rag.search(test['query'])
            
            # Get retrieved filenames
            retrieved_docs = [os.path.basename(doc['file']) for doc in documents if doc.get('file')]
            
            if top_chunks:
                distances = [c['score'] for c in top_chunks]
                avg_dist = sum(distances) / len(distances)
                
                # Calculate precision and recall
                precision = metrics.calculate_precision_at_k(retrieved_docs, test['relevant_docs'], k=10)
                recall = metrics.calculate_recall_at_k(retrieved_docs, test['relevant_docs'], k=10)
                
                print(f"  Found: {len(documents)} docs | Avg Distance: {avg_dist:.3f}")
                print(f"  Precision@10: {precision:.1%} | Recall@10: {recall:.1%}")
                
                results_by_lang[lang].append(avg_dist)
                precision_by_lang[lang].append(precision)
                recall_by_lang[lang].append(recall)
                
                # Show which relevant docs were found
                found_relevant = [d for d in retrieved_docs if d in test['relevant_docs']]
                print(f"  Relevant docs found: {len(found_relevant)}/{len(test['relevant_docs'])}")
            else:
                print(f"  Found: 0 docs")
                
        except Exception as e:
            print(f"  ERROR: {e}")
    
    print("\n" + "=" * 70)
    print("SUMMARY BY LANGUAGE (with Expanded Ground Truth)")
    print("=" * 70)
    
    for lang in ['english', 'tagalog', 'taglish']:
        if results_by_lang[lang]:
            avg_dist = sum(results_by_lang[lang]) / len(results_by_lang[lang])
            avg_prec = sum(precision_by_lang[lang]) / len(precision_by_lang[lang])
            avg_rec = sum(recall_by_lang[lang]) / len(recall_by_lang[lang])
            print(f"\n  {lang.upper()}:")
            print(f"    Avg Distance: {avg_dist:.3f}")
            print(f"    Avg Precision@10: {avg_prec:.1%}")
            print(f"    Avg Recall@10: {avg_rec:.1%}")
    
    # Overall
    all_precision = precision_by_lang['english'] + precision_by_lang['tagalog'] + precision_by_lang['taglish']
    all_recall = recall_by_lang['english'] + recall_by_lang['tagalog'] + recall_by_lang['taglish']
    
    if all_precision:
        print(f"\n  OVERALL:")
        print(f"    Avg Precision@10: {sum(all_precision)/len(all_precision):.1%}")
        print(f"    Avg Recall@10: {sum(all_recall)/len(all_recall):.1%}")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    run_search_test()
