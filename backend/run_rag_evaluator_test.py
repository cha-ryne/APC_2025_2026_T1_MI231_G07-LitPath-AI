# -*- coding: utf-8 -*-
"""
LitPath AI - RAG Evaluator Test Script
Runs LangSmith-style RAG evaluation on multiple test queries.

Tests:
1. Relevance - Does the response address the question?
2. Groundedness - Is the response grounded in retrieved documents?
3. Retrieval Relevance - Are retrieved documents relevant to the query?

Author: LitPath AI Team
Date: February 2026
"""

import os
import sys
import json
import time
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'litpath_backend.settings')

import django
django.setup()

from rag_api.rag_service import RAGService
from rag_api.rag_evaluator import RAGEvaluator, EvaluationDataset, EvaluationRunner

# ============================================================
# TEST CASES - Diverse queries covering various thesis topics
# ============================================================
TEST_CASES = [
    {
        "id": 1,
        "query": "Ano-ano ang mga epekto ng mga plant growth regulator sa sili?",
        "category": "Agriculture - Plant Science",
        "language": "Filipino"
    },
    {
        "id": 2,
        "query": "Paano nakakaapekto ang salinity stress sa mga genotype ng palay?",
        "category": "Agriculture - Crop Science",
        "language": "Filipino"
    },
    {
        "id": 3,
        "query": "Ano ang sustansyang taglay ng mga butil na tila-kanin na gawa mula sa mais?",
        "category": "Food Science - Nutrition",
        "language": "Filipino"
    },
    {
        "id": 4,
        "query": "Ano ang mga benefits ng agroforestry systems sa Pilipinas?",
        "category": "Agriculture - Forestry",
        "language": "Filipino"
    },
    {
        "id": 5,
        "query": "Paano nakaka-apekto ang nano zinc oxide sa yield at quality ng kamatis?",
        "category": "Agriculture - Nanotechnology",
        "language": "Filipino"
    },
    {
        "id": 6,
        "query": "Ano ang mga ecosystem services ng mga rubber plantation?",
        "category": "Environmental Science",
        "language": "Filipino"
    },
    {
        "id": 7,
        "query": "What factors affect consumer acceptability of brown rice?",
        "category": "Food Science - Consumer Studies",
        "language": "English"
    },
    {
        "id": 8,
        "query": "What is the impact of deforestation on Philippine forests?",
        "category": "Environmental Science - Forestry",
        "language": "English"
    },
    {
        "id": 9,
        "query": "How does phytoremediation help with soil contamination?",
        "category": "Environmental Science - Soil",
        "language": "English"
    },
    {
        "id": 10,
        "query": "What are the genetic diversity methods used for Philippine rice breeding?",
        "category": "Agriculture - Genetics",
        "language": "English"
    },
]


def run_rag_evaluation():
    """Run the complete RAG evaluation test suite"""
    
    print("=" * 80)
    print("LitPath AI - RAG Evaluator Test (LangSmith-style)")
    print(f"Date: {datetime.now().strftime('%B %d, %Y %H:%M:%S')}")
    print(f"Test Cases: {len(TEST_CASES)}")
    print("=" * 80)
    
    # Initialize RAG Service
    print("\n[INIT] Initializing RAG Service...")
    RAGService.initialize()
    rag = RAGService()
    
    # Initialize Evaluator
    print("[INIT] Initializing RAG Evaluator (LLM-as-Judge)...")
    evaluator = RAGEvaluator()
    
    # Results storage
    all_results = []
    summary = {
        "total": len(TEST_CASES),
        "evaluated": 0,
        "relevance_pass": 0,
        "groundedness_pass": 0,
        "retrieval_relevance_pass": 0,
        "overall_pass": 0,
        "errors": 0,
    }
    
    for idx, test_case in enumerate(TEST_CASES):
        test_id = test_case["id"]
        query = test_case["query"]
        category = test_case["category"]
        
        # Delay between test cases to avoid rate limits (Gemini free tier)
        if idx > 0:
            delay = 15  # seconds between test cases
            print(f"\n  [WAIT] Waiting {delay}s between test cases to avoid rate limits...")
            time.sleep(delay)
        
        print(f"\n{'-' * 80}")
        print(f"Test Case {test_id}: {query}")
        print(f"Category: {category} | Language: {test_case['language']}")
        print(f"{'-' * 80}")
        
        try:
            # Step 1: Run RAG search
            print(f"  [SEARCH] Running RAG search...")
            start_time = time.time()
            top_chunks, documents, distance_threshold = rag.search(query)
            search_time = time.time() - start_time
            
            print(f"  [SEARCH] Found {len(documents)} documents, {len(top_chunks)} chunks in {search_time:.2f}s")
            
            if not top_chunks:
                print(f"  [SKIP] No results found - skipping evaluation")
                all_results.append({
                    "test_id": test_id,
                    "query": query,
                    "category": category,
                    "status": "no_results",
                    "documents_found": 0,
                })
                continue
            
            # Step 2: Generate AI Overview
            print(f"  [GENERATE] Generating AI overview...")
            start_time = time.time()
            overview = rag.generate_overview(top_chunks, query, distance_threshold)
            gen_time = time.time() - start_time
            print(f"  [GENERATE] Overview generated in {gen_time:.2f}s")
            
            if not overview or overview.startswith("Error"):
                print(f"  [SKIP] Overview generation failed")
                all_results.append({
                    "test_id": test_id,
                    "query": query,
                    "category": category,
                    "status": "generation_failed",
                    "documents_found": len(documents),
                })
                continue
            
            # Step 3: Prepare retrieved docs text for evaluation
            retrieved_doc_texts = [c['chunk'] for c in top_chunks[:10]]
            
            # Step 4: Run full RAG evaluation (Relevance + Groundedness + Retrieval Relevance)
            print(f"  [EVALUATE] Running LLM-as-Judge evaluation...")
            start_time = time.time()
            report = evaluator.evaluate(
                query=query,
                response=overview,
                retrieved_docs=retrieved_doc_texts,
                skip_correctness=True,  # No reference answers
                skip_retrieval_relevance=False
            )
            eval_time = time.time() - start_time
            print(f"  [EVALUATE] Evaluation completed in {eval_time:.2f}s")
            
            # Extract scores
            relevance_pass = report.relevance.score if report.relevance else None
            groundedness_pass = report.groundedness.score if report.groundedness else None
            retrieval_pass = report.retrieval_relevance.score if report.retrieval_relevance else None
            overall_pass = relevance_pass and groundedness_pass
            
            # Print results
            rel_icon = "PASS" if relevance_pass else "FAIL"
            grd_icon = "PASS" if groundedness_pass else "FAIL"
            ret_icon = "PASS" if retrieval_pass else "FAIL"
            ovr_icon = "PASS" if overall_pass else "FAIL"
            
            print(f"\n  Results:")
            print(f"    Relevance:           {rel_icon}")
            if report.relevance:
                print(f"      → {report.relevance.explanation[:120]}...")
            print(f"    Groundedness:        {grd_icon}")
            if report.groundedness:
                print(f"      → {report.groundedness.explanation[:120]}...")
            print(f"    Retrieval Relevance: {ret_icon}")
            if report.retrieval_relevance:
                print(f"      → {report.retrieval_relevance.explanation[:120]}...")
            print(f"    Overall:             {ovr_icon}")
            
            # Update summary
            summary["evaluated"] += 1
            if relevance_pass:
                summary["relevance_pass"] += 1
            if groundedness_pass:
                summary["groundedness_pass"] += 1
            if retrieval_pass:
                summary["retrieval_relevance_pass"] += 1
            if overall_pass:
                summary["overall_pass"] += 1
            
            # Store result
            result_entry = {
                "test_id": test_id,
                "query": query,
                "category": category,
                "language": test_case["language"],
                "status": "evaluated",
                "documents_found": len(documents),
                "chunks_analyzed": len(top_chunks),
                "search_time_s": round(search_time, 2),
                "generation_time_s": round(gen_time, 2),
                "evaluation_time_s": round(eval_time, 2),
                "overview_excerpt": overview[:300] + "..." if len(overview) > 300 else overview,
                "relevance": {
                    "score": relevance_pass,
                    "explanation": report.relevance.explanation if report.relevance else None
                },
                "groundedness": {
                    "score": groundedness_pass,
                    "explanation": report.groundedness.explanation if report.groundedness else None
                },
                "retrieval_relevance": {
                    "score": retrieval_pass,
                    "explanation": report.retrieval_relevance.explanation if report.retrieval_relevance else None
                },
                "overall_pass": overall_pass,
                "overall_score": report.overall_score
            }
            all_results.append(result_entry)
            
        except Exception as e:
            print(f"  [ERROR] Test case {test_id} failed: {e}")
            import traceback
            traceback.print_exc()
            summary["errors"] += 1
            all_results.append({
                "test_id": test_id,
                "query": query,
                "category": category,
                "status": "error",
                "error": str(e)
            })
    
    # ============================================================
    # SUMMARY
    # ============================================================
    evaluated = summary["evaluated"]
    
    print(f"\n{'=' * 80}")
    print("EVALUATION SUMMARY")
    print(f"{'=' * 80}")
    print(f"\nTotal Test Cases:        {summary['total']}")
    print(f"Successfully Evaluated:  {evaluated}")
    print(f"Errors:                  {summary['errors']}")
    
    if evaluated > 0:
        rel_rate = summary["relevance_pass"] / evaluated * 100
        grd_rate = summary["groundedness_pass"] / evaluated * 100
        ret_rate = summary["retrieval_relevance_pass"] / evaluated * 100
        ovr_rate = summary["overall_pass"] / evaluated * 100
        
        print(f"\n{'-' * 50}")
        print(f"Metric                    Pass  Rate")
        print(f"{'-' * 50}")
        print(f"Relevance                 {summary['relevance_pass']}/{evaluated}   {rel_rate:.1f}%")
        print(f"Groundedness              {summary['groundedness_pass']}/{evaluated}   {grd_rate:.1f}%")
        print(f"Retrieval Relevance       {summary['retrieval_relevance_pass']}/{evaluated}   {ret_rate:.1f}%")
        print(f"Overall (Rel + Grd)       {summary['overall_pass']}/{evaluated}   {ovr_rate:.1f}%")
        print(f"{'-' * 50}")
    
    print(f"\n{'=' * 80}")
    print("Test Complete!")
    print(f"{'=' * 80}")
    
    # Save results to JSON
    output = {
        "test_date": datetime.now().isoformat(),
        "test_cases": len(TEST_CASES),
        "summary": summary,
        "pass_rates": {
            "relevance": round(summary["relevance_pass"] / evaluated * 100, 1) if evaluated else 0,
            "groundedness": round(summary["groundedness_pass"] / evaluated * 100, 1) if evaluated else 0,
            "retrieval_relevance": round(summary["retrieval_relevance_pass"] / evaluated * 100, 1) if evaluated else 0,
            "overall": round(summary["overall_pass"] / evaluated * 100, 1) if evaluated else 0,
        } if evaluated > 0 else {},
        "results": all_results
    }
    
    output_path = os.path.join(os.path.dirname(__file__), "rag_evaluator_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nResults saved to: {output_path}")
    
    return output


if __name__ == "__main__":
    run_rag_evaluation()
