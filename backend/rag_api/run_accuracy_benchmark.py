"""
LitPath AI - Comprehensive Accuracy Benchmark

This script runs a full accuracy evaluation of the LitPath AI system:
1. Precision@K and Recall@K (Search Quality)
2. Distance Score Statistics (Search Relevance)
3. Citation Verification (AI Grounding)
4. ROUGE Scores (Summary Quality) - if references provided
5. Hallucination Detection (Factual Accuracy)

Usage:
    cd backend
    python manage.py shell < rag_api/run_accuracy_benchmark.py
    
    OR
    
    python rag_api/run_accuracy_benchmark.py

Author: LitPath AI Team
Date: December 2025
"""

import os
import sys
import json
from datetime import datetime

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'litpath_backend.settings')

import django
django.setup()

from rag_api.rag_service import RAGService
from rag_api.accuracy_metrics import AccuracyMetrics

# ============= TEST QUERIES WITH EXPECTED RELEVANT DOCUMENTS =============
# 
# Format: Each query has:
#   - query: The search query
#   - relevant_docs: List of document filenames that SHOULD be returned
#   - reference_summary: (Optional) Human-written ideal summary for ROUGE scoring
#
# NOTE: You need to manually verify which documents are relevant for each query
# by examining your thesis collection. These are examples you should customize.

TEST_QUERIES = [
    # === Specific Topic Queries ===
    {
        "id": 1,
        "query": "rice genotypes salt stress tolerance salinity",
        "relevant_docs": [
            "STII-T-2024005332 Responses of Rice Genotypes Contrasting in Salinity Tolerance to Salt Stress (134) 2016.txt"
        ],
        "reference_summary": None,
        "category": "specific"
    },
    {
        "id": 2,
        "query": "machine learning neural network deep learning",
        "relevant_docs": [
            "STII-T-2024005344 Sparsity-aware Orthogonal Initialization of Multilayer Perceptions and Convolutional (151) 2023.txt",
            "STII-T-2024005776 Populating Galactic Dark Matter Halos with Galaxies Using Machine Learning (71) 2023.txt"
        ],
        "reference_summary": None,
        "category": "specific"
    },
    {
        "id": 3,
        "query": "agroforestry systems and sustainable farming practices",
        "relevant_docs": [
            "p-STII-T-2023004547-Adoption of agroforestry system and farm tourism potential of conservation farming villages  2021 (288) 428213.txt"
        ],
        "reference_summary": None,
        "category": "specific"
    },
    {
        "id": 4,
        "query": "plant growth regulators and fruit quality improvement",
        "relevant_docs": [
            "p-STII-T-2023003797-Use of plant growth regulators to induce tolerance, promote growth, and enhance fruiting quality 2022 (187).txt"
        ],
        "reference_summary": None,
        "category": "specific"
    },
    {
        "id": 5,
        "query": "gene identification and biosynthesis pathways in silico analysis",
        "relevant_docs": [
            "p-STII-T-2023004515-In silico identification and analysis of genes associated with the biosynthesis  2022 (408) 429405.txt"
        ],
        "reference_summary": None,
        "category": "specific"
    },
    
    # === Broad Topic Queries ===
    {
        "id": 6,
        "query": "soil quality ecosystem environment pollution",
        "relevant_docs": [
            "STII-T-2022002688-Phytoremediation and effect of soil amendments on chromium and nickel uptake in lowland rice soils affected by mining activities.txt",
            "STII-T-2023004504-Soil Quality Assessment of Selected Fruit Tree Plantations in Bacnotan, La Union, Philippines 2022 (178).txt",
            "STII-T-2023003151-Effects of nanomaterial on culturable bacterial population, microbial biomass, and enzyme activities in two soil types 2019 (136).txt"
        ],
        "reference_summary": None,
        "category": "broad"
    },
    {
        "id": 7,
        "query": "nutritional value food acceptability sensory characteristics",
        "relevant_docs": [
            "p-STII-T-2023004659-Nutritional value, storage stability and acceptability (Zea mays L. Los banos (144).txt",
            "STII-T-2023003181-Acceptability Nutritional and Non-Nutritional  Components of Rice (Orayza sativa L.) 2017 (184).txt",
            "STII-T-2023003322-Macronutrient and selected mineral contents and sensory characteristic of loaf bread 2019 (121).txt",
            "STII-T-2023004471-The nutritional value, phytochemical components, and acceptability of rice (Oryza sativa L.) 2015 (148).txt",
            "STII-T-2023004472-Nutrient content, health properties and acceptability of taro [Colocasia esculenta (L.) 2014 (167).txt"
        ],
        "reference_summary": None,
        "category": "broad"
    },
    {
        "id": 8,
        "query": "rice breeding QTL genetic diversity genome",
        "relevant_docs": [
            "STII-T-2023003032-Genetic diversity assessment of selected Philippine inbred rice (Oryza sativa L.) lines and its use in hybrid rice breeding 2016 (107).txt",
            "STII-T-2023003184-Genome-Wide Indel Markers to Differentiate Oryza Genomes AA and GG O. Granulat A Nees & Arn. Ex. G. 2019 (139).txt",
            "STII-T-2023003185-QTL Associated with Phosphorus deficiency in Early Root Establishment in Rice (Orayza sativa L.) at Seedling Stage 2017 (107).txt",
            "STII-T-2023003187-QTL Pyramiding for Abiotic Stress Tolerance in 'IR64' Rice 2018 (91).txt"
        ],
        "reference_summary": None,
        "category": "broad"
    },
    
    # === Narrow/Niche Queries ===
    {
        "id": 9,
        "query": "support vector machine preconditioning optimization",
        "relevant_docs": [
            "STII-T-2021000572-Preconditioning the support vector machine (69) 2019.txt"
        ],
        "reference_summary": None,
        "category": "narrow"
    },
    {
        "id": 10,
        "query": "boundary value problems homogenization mathematical analysis",
        "relevant_docs": [
            "STII-T-2021000573-Homogenization of some boundary value problems (96) 2019.txt"
        ],
        "reference_summary": None,
        "category": "narrow"
    },
    {
        "id": 11,
        "query": "small world networks characterization graph theory",
        "relevant_docs": [
            "STII-T-2022001264 CHARACTERIZATION OF SMALL REAL-WORLD NETWORKS  APR, 2013_Page_78.txt"
        ],
        "reference_summary": None,
        "category": "narrow"
    },
    
    # === Ambiguous Queries ===
    {
        "id": 12,
        "query": "health nutrition diet disease management Philippines",
        "relevant_docs": [
            "STII-T-2023003277-Assessment of knowledge attitude and practices of adults on cholesterol management towards 2019 (120).txt",
            "STII-T-2023004202-Readiness to change dietary behaviors among adult women with non-communicable diseases in Parañaque 2022 (152).txt",
            "STII-T-2024005480 Use of mobile application in weight management among Filipino adults in the University (108) 2019.txt"
        ],
        "reference_summary": None,
        "category": "ambiguous"
    },
    {
        "id": 13,
        "query": "biology ecology marine coastal aquatic",
        "relevant_docs": [
            "STII-T-2023003088-Effects of light on behaviour, growth and survival of Stichopus cf. horrens juveniles 2019 (85).txt",
            "STII-T-2023003042-Coastal environmental dynamics of Manamoc Island, Cuyo, Palawan, Philippines 2018 (183).txt",
            "STII-T-2024005898 Understanding the dynamics of hypoxia and eutrophication in Manila Bay (181) 2024.txt",
            "STII-T-2025006106 Insights into the habitat use of Dugongs (Dugong dugon) in (149) 2024.txt"
        ],
        "reference_summary": None,
        "category": "ambiguous"
    },
    
    # === Expected No/Few Results ===
    {
        "id": 14,
        "query": "quantum computing blockchain cryptocurrency",
        "relevant_docs": [],
        "reference_summary": None,
        "category": "no_results"
    },
    {
        "id": 15,
        "query": "artificial general intelligence consciousness",
        "relevant_docs": [],
        "reference_summary": None,
        "category": "no_results"
    },
]


def run_benchmark(
    test_queries: list = None,
    use_nli: bool = False,
    verbose: bool = True
):
    """
    Run comprehensive accuracy benchmark
    
    Args:
        test_queries: List of test query dictionaries
        use_nli: Whether to use NLI model for hallucination detection
        verbose: Print detailed output
    """
    if test_queries is None:
        test_queries = TEST_QUERIES
    
    print("=" * 70)
    print("LitPath AI - Comprehensive Accuracy Benchmark")
    print("=" * 70)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total test queries: {len(test_queries)}")
    print(f"Hallucination detection: {'NLI' if use_nli else 'Keyword-based'}")
    print("=" * 70)
    
    # Initialize services
    print("\n[1/5] Initializing RAG service...")
    RAGService.initialize()
    rag = RAGService()
    accuracy = AccuracyMetrics()
    
    # Results storage
    all_results = []
    
    # Aggregate metrics
    total_precision_5 = []
    total_precision_10 = []
    total_recall_5 = []
    total_recall_10 = []
    total_distance_scores = []
    total_citation_rates = []
    total_hallucination_rates = []
    total_rouge_scores = []
    
    print("\n[2/5] Running test queries...")
    
    for i, test in enumerate(test_queries):
        query_id = test.get("id", i + 1)
        query = test["query"]
        relevant_docs = test.get("relevant_docs", [])
        reference_summary = test.get("reference_summary")
        category = test.get("category", "unknown")
        
        if verbose:
            print(f"\n--- Query {query_id}/{len(test_queries)}: {query[:50]}...")
        
        try:
            # Run search
            top_chunks, documents, distance_threshold = rag.search(query)
            
            # Get retrieved document filenames
            retrieved_docs = [doc["file"] for doc in documents]
            distance_scores = [c["score"] for c in top_chunks]
            
            # Generate AI overview
            overview = rag.generate_overview(top_chunks, query, distance_threshold)
            
            # Calculate search metrics
            search_metrics = rag.calculate_search_metrics(top_chunks, distance_threshold)
            citation_metrics = rag.verify_citations(overview, top_chunks)
            
            # Calculate Precision@K and Recall@K
            if relevant_docs:
                precision_recall = accuracy.calculate_precision_recall_metrics(
                    retrieved_docs, relevant_docs, k_values=[5, 10]
                )
                total_precision_5.append(precision_recall["precision@5"])
                total_precision_10.append(precision_recall["precision@10"])
                total_recall_5.append(precision_recall["recall@5"])
                total_recall_10.append(precision_recall["recall@10"])
            else:
                precision_recall = {"note": "No relevant_docs labeled for this query"}
            
            # Hallucination detection
            source_texts = [c["chunk"] for c in top_chunks[:5]]
            if use_nli:
                hallucination = accuracy.detect_hallucinations_nli(overview, source_texts)
            else:
                hallucination = accuracy.detect_hallucinations_keyword(overview, source_texts)
            
            total_hallucination_rates.append(100 - hallucination.get("hallucination_rate", 0))
            
            # ROUGE scores if reference provided
            rouge_scores = None
            if reference_summary:
                rouge_scores = accuracy.calculate_rouge_summary(overview, reference_summary)
                if "average_f1" in rouge_scores:
                    total_rouge_scores.append(rouge_scores["average_f1"])
            
            # Collect aggregate data
            if search_metrics.get("avg_distance"):
                total_distance_scores.append(search_metrics["avg_distance"])
            total_citation_rates.append(citation_metrics.get("verification_rate", 0))
            
            # Store result
            result = {
                "query_id": query_id,
                "query": query,
                "category": category,
                "retrieved_count": len(retrieved_docs),
                "search_metrics": search_metrics,
                "precision_recall": precision_recall,
                "citation_verification": {
                    "total": citation_metrics.get("total_citations", 0),
                    "verified": citation_metrics.get("verified_citations", 0),
                    "rate": citation_metrics.get("verification_rate", 0)
                },
                "hallucination": {
                    "method": hallucination.get("method"),
                    "factual_accuracy": hallucination.get("factual_accuracy", 0)
                },
                "rouge": rouge_scores
            }
            
            all_results.append(result)
            
            if verbose:
                print(f"    Documents: {len(retrieved_docs)}, "
                      f"Avg Distance: {search_metrics.get('avg_distance', 'N/A')}, "
                      f"Citations: {citation_metrics.get('verification_rate', 0)}%, "
                      f"Factual: {hallucination.get('factual_accuracy', 0)}%")
                
        except Exception as e:
            print(f"    ERROR: {e}")
            all_results.append({
                "query_id": query_id,
                "query": query,
                "error": str(e)
            })
    
    # Calculate aggregate statistics
    print("\n[3/5] Calculating aggregate statistics...")
    
    aggregate_stats = {
        "total_queries": len(test_queries),
        "successful_queries": len([r for r in all_results if "error" not in r]),
        "search_quality": {
            "avg_distance": round(sum(total_distance_scores) / len(total_distance_scores), 4) if total_distance_scores else None,
            "precision@5": round(sum(total_precision_5) / len(total_precision_5), 4) if total_precision_5 else "N/A (no labeled queries)",
            "precision@10": round(sum(total_precision_10) / len(total_precision_10), 4) if total_precision_10 else "N/A (no labeled queries)",
            "recall@5": round(sum(total_recall_5) / len(total_recall_5), 4) if total_recall_5 else "N/A (no labeled queries)",
            "recall@10": round(sum(total_recall_10) / len(total_recall_10), 4) if total_recall_10 else "N/A (no labeled queries)",
        },
        "ai_quality": {
            "avg_citation_verification": round(sum(total_citation_rates) / len(total_citation_rates), 2) if total_citation_rates else None,
            "avg_factual_accuracy": round(sum(total_hallucination_rates) / len(total_hallucination_rates), 2) if total_hallucination_rates else None,
            "avg_rouge_f1": round(sum(total_rouge_scores) / len(total_rouge_scores), 4) if total_rouge_scores else "N/A (no reference summaries)",
        }
    }
    
    # Print summary report
    print("\n[4/5] Generating report...")
    print("\n" + "=" * 70)
    print("BENCHMARK RESULTS SUMMARY")
    print("=" * 70)
    
    print("\n📊 SEARCH QUALITY METRICS")
    print("-" * 40)
    print(f"  Average Distance Score: {aggregate_stats['search_quality']['avg_distance']}")
    print(f"  Precision@5:  {aggregate_stats['search_quality']['precision@5']}")
    print(f"  Precision@10: {aggregate_stats['search_quality']['precision@10']}")
    print(f"  Recall@5:     {aggregate_stats['search_quality']['recall@5']}")
    print(f"  Recall@10:    {aggregate_stats['search_quality']['recall@10']}")
    
    print("\n🤖 AI GENERATION QUALITY METRICS")
    print("-" * 40)
    print(f"  Citation Verification Rate: {aggregate_stats['ai_quality']['avg_citation_verification']}%")
    print(f"  Factual Accuracy Rate:      {aggregate_stats['ai_quality']['avg_factual_accuracy']}%")
    print(f"  ROUGE F1 Score:             {aggregate_stats['ai_quality']['avg_rouge_f1']}")
    
    # Quality assessment
    print("\n📈 QUALITY ASSESSMENT")
    print("-" * 40)
    
    # Search quality assessment
    avg_dist = aggregate_stats['search_quality']['avg_distance']
    if avg_dist:
        if avg_dist < 0.8:
            print("  Search Relevance: ✅ EXCELLENT (avg distance < 0.8)")
        elif avg_dist < 1.0:
            print("  Search Relevance: ✅ GOOD (avg distance < 1.0)")
        elif avg_dist < 1.3:
            print("  Search Relevance: ⚠️ MODERATE (avg distance < 1.3)")
        else:
            print("  Search Relevance: ⚠️ FAIR (avg distance >= 1.3)")
    
    # Citation quality assessment
    citation_rate = aggregate_stats['ai_quality']['avg_citation_verification']
    if citation_rate:
        if citation_rate >= 90:
            print("  Citation Accuracy: ✅ EXCELLENT (>= 90%)")
        elif citation_rate >= 75:
            print("  Citation Accuracy: ✅ GOOD (>= 75%)")
        elif citation_rate >= 60:
            print("  Citation Accuracy: ⚠️ FAIR (>= 60%)")
        else:
            print("  Citation Accuracy: ❌ NEEDS IMPROVEMENT (< 60%)")
    
    # Factual accuracy assessment
    factual_rate = aggregate_stats['ai_quality']['avg_factual_accuracy']
    if factual_rate:
        if factual_rate >= 85:
            print("  Factual Accuracy: ✅ EXCELLENT (>= 85%)")
        elif factual_rate >= 70:
            print("  Factual Accuracy: ✅ GOOD (>= 70%)")
        elif factual_rate >= 50:
            print("  Factual Accuracy: ⚠️ FAIR (>= 50%)")
        else:
            print("  Factual Accuracy: ❌ NEEDS IMPROVEMENT (< 50%)")
    
    print("\n" + "=" * 70)
    
    # Save results to file
    print("[5/5] Saving results...")
    
    output = {
        "benchmark_date": datetime.now().isoformat(),
        "config": {
            "total_queries": len(test_queries),
            "hallucination_method": "NLI" if use_nli else "keyword_overlap"
        },
        "aggregate_stats": aggregate_stats,
        "individual_results": all_results
    }
    
    output_path = os.path.join(
        os.path.dirname(__file__), 
        f"benchmark_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"Results saved to: {output_path}")
    print("\n✅ Benchmark complete!")
    
    return output


if __name__ == "__main__":
    # Run benchmark with keyword-based hallucination detection (faster)
    # Set use_nli=True for more accurate but slower detection
    results = run_benchmark(use_nli=False, verbose=True)
