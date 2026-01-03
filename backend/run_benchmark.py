# -*- coding: utf-8 -*-
"""
Simple Accuracy Benchmark Script for LitPath AI
Run from backend directory: python run_benchmark.py
"""

import os
import sys

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'litpath_backend.settings')

import django
django.setup()

from rag_api.rag_service import RAGService
from rag_api.accuracy_metrics import AccuracyMetrics

# Test queries with EXPANDED ground truth labels
# Categories: english, tagalog, taglish
# Relevance tiers: highly_relevant (must find), relevant (should find), acceptable (related)
TEST_QUERIES = [
    # === ENGLISH QUERIES ===
    {
        "id": 1,
        "query": "rice genotypes salt stress tolerance salinity",
        "relevant_docs": [
            # Highly relevant - directly about rice + salt/stress
            "STII-T-2024005332 Responses of Rice Genotypes Contrasting in Salinity Tolerance to Salt Stress (134) 2016.txt",
            "STII-T-2023003187-QTL Pyramiding for Abiotic Stress Tolerance in 'IR64' Rice 2018 (91).txt",
            # Relevant - rice genetics/physiology
            "STII-T-2023003004-Synchronism of leaf development and leaf elongation rates of contrasting rice (Oryza sativa L.) genotypes 2014 (139).txt",
            "STII-T-2023003032-Genetic diversity assessment of selected Philippine inbred rice (Oryza sativa L.) lines and its use in hybrid rice breeding 2016 (107).txt",
            "STII-T-2023003185-QTL Associated with Phosphorus deficiency in Early Root Establishment in Rice (Orayza sativa L.) at Seedling Stage 2017 (107).txt",
            "STII-T-2023003184-Genome-Wide Indel Markers to Differentiate Oryza Genomes AA and GG O. Granulat A Nees & Arn. Ex. G. 2019 (139).txt",
        ],
        "category": "english",
        "language": "english"
    },
    {
        "id": 2,
        "query": "support vector machine preconditioning optimization",
        "relevant_docs": [
            # Highly relevant - ML/optimization
            "STII-T-2021000572-Preconditioning the support vector machine (69) 2019.txt",
            "STII-T-2024005344 Sparsity-aware Orthogonal Initialization of Multilayer Perceptions and Convolutional (151) 2023.txt",
            "STII-T-2024005776 Populating Galactic Dark Matter Halos with Galaxies Using Machine Learning (71) 2023.txt",
            # Related - computational/mathematical
            "STII-T-2022001264 CHARACTERIZATION OF SMALL REAL-WORLD NETWORKS  APR, 2013_Page_78.txt",
            "STII-T-2025006109 Bayesian Autoregressive Distributed Lag via Stochastic (126) 2017.txt",
        ],
        "category": "english",
        "language": "english"
    },
    {
        "id": 3,
        "query": "nutritional value food acceptability rice corn",
        "relevant_docs": [
            # Highly relevant - nutrition + rice/corn + acceptability
            "p-STII-T-2023004659-Nutritional value, storage stability and acceptability (Zea mays L. Los banos (144).txt",
            "STII-T-2023003181-Acceptability Nutritional and Non-Nutritional  Components of Rice (Orayza sativa L.) 2017 (184).txt",
            "STII-T-2023004471-The nutritional value, phytochemical components, and acceptability of rice (Oryza sativa L.) 2015 (148).txt",
            "STII-T-2023004653-Nutrient and phytochemical contents, carbohydrate profile and acceptability of rice-like grains from corn [Zea mays L.] (141).txt",
            "STII-T-2023004507-The Nutritional content, health value, and acceptability of rice-like grains from sago 2014 (152).txt",
            # Relevant - nutrition/food
            "STII-T-2023003275-Consumer acceptability and perceptions for brown rice among household heads in selected 2018(280).txt",
            "STII-T-2023004472-Nutrient content, health properties and acceptability of taro [Colocasia esculenta (L.) 2014 (167).txt",
            "STII-T-2024005408 Nutritional and functional composition, In vitro and In vivo anti-oxidant (188) 2022.txt",
            "STII-T-2023003322-Macronutrient and selected mineral contents and sensory characteristic of loaf bread 2019 (121).txt",
            "STII-T-2023004665-Nutritional composition and sensory characteristics of fish powder from spotted sardinella, 2013 (109).txt",
        ],
        "category": "english",
        "language": "english"
    },
    
    # === TAGALOG QUERIES ===
    {
        "id": 4,
        "query": "palay na matibay sa asin at tubig alat",  # Rice tolerant to salt
        "relevant_docs": [
            # Same as English query 1 - about rice + salt
            "STII-T-2024005332 Responses of Rice Genotypes Contrasting in Salinity Tolerance to Salt Stress (134) 2016.txt",
            "STII-T-2023003187-QTL Pyramiding for Abiotic Stress Tolerance in 'IR64' Rice 2018 (91).txt",
            "STII-T-2023003004-Synchronism of leaf development and leaf elongation rates of contrasting rice (Oryza sativa L.) genotypes 2014 (139).txt",
            "STII-T-2023003032-Genetic diversity assessment of selected Philippine inbred rice (Oryza sativa L.) lines and its use in hybrid rice breeding 2016 (107).txt",
        ],
        "category": "tagalog",
        "language": "tagalog"
    },
    {
        "id": 5,
        "query": "sustansya at nutrisyon ng pagkain mula sa bigas at mais",  # Nutrition from rice and corn
        "relevant_docs": [
            # Same as English query 3 - nutrition + rice/corn
            "p-STII-T-2023004659-Nutritional value, storage stability and acceptability (Zea mays L. Los banos (144).txt",
            "STII-T-2023003181-Acceptability Nutritional and Non-Nutritional  Components of Rice (Orayza sativa L.) 2017 (184).txt",
            "STII-T-2023004471-The nutritional value, phytochemical components, and acceptability of rice (Oryza sativa L.) 2015 (148).txt",
            "STII-T-2023004653-Nutrient and phytochemical contents, carbohydrate profile and acceptability of rice-like grains from corn [Zea mays L.] (141).txt",
            "STII-T-2023004507-The Nutritional content, health value, and acceptability of rice-like grains from sago 2014 (152).txt",
        ],
        "category": "tagalog",
        "language": "tagalog"
    },
    {
        "id": 6,
        "query": "pagtatanim ng puno at pagsasaka na napapanatili",  # Sustainable tree planting and farming
        "relevant_docs": [
            "p-STII-T-2023004547-Adoption of agroforestry system and farm tourism potential of conservation farming villages  2021 (288) 428213.txt",
            "STII-T-2023002925-Ecosystem services of rubber plantation in Mount Makiling Forest Reserve Philippines 2016 (125).txt",
            "STII-T-2023003219-Effects of Rootpruning on The Root Grow potential (RGP) of Three Philippine Native Tree Species 2020 (89).txt",
            "STII-T-2023003460-Analysis of forest loss rates, trends, and its implications to key deforestation drivers and forest  2016 (222).txt",
        ],
        "category": "tagalog",
        "language": "tagalog"
    },
    
    # === TAGLISH (MIXED) QUERIES ===
    {
        "id": 7,
        "query": "pag-aaral ng rice varieties na resistant sa salt stress",  # Study of rice varieties resistant to salt stress
        "relevant_docs": [
            # Same rice + salt docs
            "STII-T-2024005332 Responses of Rice Genotypes Contrasting in Salinity Tolerance to Salt Stress (134) 2016.txt",
            "STII-T-2023003187-QTL Pyramiding for Abiotic Stress Tolerance in 'IR64' Rice 2018 (91).txt",
            "STII-T-2023003004-Synchronism of leaf development and leaf elongation rates of contrasting rice (Oryza sativa L.) genotypes 2014 (139).txt",
            "STII-T-2023003032-Genetic diversity assessment of selected Philippine inbred rice (Oryza sativa L.) lines and its use in hybrid rice breeding 2016 (107).txt",
        ],
        "category": "taglish",
        "language": "taglish"
    },
    {
        "id": 8,
        "query": "plant growth regulators para sa quality ng prutas",  # PGR for fruit quality
        "relevant_docs": [
            "p-STII-T-2023003797-Use of plant growth regulators to induce tolerance, promote growth, and enhance fruiting quality 2022 (187).txt",
            "STII-T-2023003162-Synthesis and characterization of nano zinc oxide foliar fertilizer and its effect on yield and postharvest quality of tomato 2018 (143).txt",
            "STII-T-2024005585 Morphological and physiological responses of different accessions of tomato (162) 2022.txt",
            "STII-T-2023003548-Characterization of roseleaf raspberry (Rubus rosifolius Sm.) in Its native habitat and Its acclimation under  2014 (150).txt",
        ],
        "category": "taglish",
        "language": "taglish"
    },
    {
        "id": 9,
        "query": "machine learning at artificial intelligence sa agriculture",  # ML and AI in agriculture
        "relevant_docs": [
            "STII-T-2024005776 Populating Galactic Dark Matter Halos with Galaxies Using Machine Learning (71) 2023.txt",
            "STII-T-2024005344 Sparsity-aware Orthogonal Initialization of Multilayer Perceptions and Convolutional (151) 2023.txt",
            "STII-T-2024005822 Agriculture 4.0 readiness among crops and livestock research (273) 2023.txt",
            "STII-T-2023003260-A predictive model for the Technology transfer of government research and development institute 2016 (99).txt",
        ],
        "category": "taglish",
        "language": "taglish"
    },
    
    # === OUT-OF-DOMAIN (NO RESULTS EXPECTED) ===
    {
        "id": 10,
        "query": "quantum computing blockchain cryptocurrency",
        "relevant_docs": [],  # Nothing in corpus matches this
        "category": "no_results",
        "language": "english"
    },
]


def run_benchmark():
    print("=" * 70)
    print("LitPath AI - Accuracy Benchmark")
    print("=" * 70)
    
    # Initialize RAG service first (required before use)
    print("\n[INIT] Initializing RAG Service...")
    RAGService.initialize()
    
    # Now get the singleton instance
    rag_service = RAGService()
    metrics_calculator = AccuracyMetrics()
    
    results = []
    
    for test in TEST_QUERIES:
        lang_label = test.get('language', 'unknown').upper()
        print(f"\n[Query {test['id']}] [{lang_label}] {test['query']}")
        print("-" * 50)
        
        # Perform search
        try:
            # search() returns: (top_chunks, documents, distance_threshold)
            top_chunks, documents, distance_threshold = rag_service.search(test['query'])
        except Exception as e:
            print(f"  ERROR: {e}")
            continue
        
        # Calculate search metrics (expects top_chunks with 'score' field)
        search_metrics = rag_service.calculate_search_metrics(top_chunks)
        
        # Get retrieved document filenames
        retrieved_docs = []
        for doc in documents:
            if doc and 'file' in doc:
                retrieved_docs.append(os.path.basename(doc['file']))
        
        # Calculate Precision@K and Recall@K
        if test['relevant_docs']:
            precision = metrics_calculator.calculate_precision_at_k(
                retrieved_docs=retrieved_docs,
                relevant_docs=test['relevant_docs'],
                k=10
            )
            recall = metrics_calculator.calculate_recall_at_k(
                retrieved_docs=retrieved_docs,
                relevant_docs=test['relevant_docs'],
                k=10
            )
            f1 = metrics_calculator.calculate_f1_at_k(
                retrieved_docs=retrieved_docs,
                relevant_docs=test['relevant_docs'],
                k=10
            )
        else:
            precision = None
            recall = None
            f1 = None
        
        # Generate AI response
        try:
            ai_response = rag_service.generate_overview(
                top_chunks,
                test['query'],
                distance_threshold
            )
        except Exception as e:
            ai_response = f"Error generating response: {e}"
        
        # Get source texts for hallucination detection
        source_texts = []
        if top_chunks:
            source_texts = [c['chunk'] for c in top_chunks[:5]]  # Top 5 chunks
        
        # Detect hallucinations (keyword method - fast)
        hallucination_result = metrics_calculator.detect_hallucinations_keyword(
            generated_text=ai_response,
            source_texts=source_texts
        )
        
        # Verify citations - verify_citations expects top_chunks directly
        citation_result = rag_service.verify_citations(ai_response, top_chunks)
        
        # Print results
        print(f"  Documents Retrieved: {search_metrics['documents_returned']}")
        print(f"  Avg Distance: {search_metrics['avg_distance']:.3f}" if search_metrics['avg_distance'] else "  Avg Distance: N/A")
        if search_metrics['min_distance'] is not None:
            print(f"  Distance Range: {search_metrics['min_distance']:.3f} - {search_metrics['max_distance']:.3f}")
        
        if precision is not None:
            print(f"  Precision@10: {precision:.1%}")
            print(f"  Recall@10: {recall:.1%}")
            print(f"  F1@10: {f1:.3f}")
        
        print(f"  Factual Accuracy: {hallucination_result['factual_accuracy']:.1f}%")
        print(f"  Citation Verification Rate: {citation_result['verification_rate']:.1f}%")
        
        results.append({
            "query_id": test['id'],
            "query": test['query'],
            "category": test['category'],
            "language": test.get('language', 'unknown'),
            "search_metrics": search_metrics,
            "precision_at_10": precision,
            "recall_at_10": recall,
            "f1_at_10": f1,
            "factual_accuracy": hallucination_result['factual_accuracy'],
            "citation_verification_rate": citation_result['verification_rate']
        })
    
    # Aggregate statistics
    print("\n" + "=" * 70)
    print("AGGREGATE RESULTS")
    print("=" * 70)
    
    if not results:
        print("No results to aggregate")
        return results
    
    # Average metrics - handle None values
    valid_distances = [r['search_metrics']['avg_distance'] for r in results if r['search_metrics']['avg_distance'] is not None]
    avg_distance = sum(valid_distances) / len(valid_distances) if valid_distances else 0
    avg_factual = sum(r['factual_accuracy'] for r in results) / len(results)
    avg_citation = sum(r['citation_verification_rate'] for r in results) / len(results)
    
    # Precision/Recall for queries with relevant docs
    precision_results = [r['precision_at_10'] for r in results if r['precision_at_10'] is not None]
    recall_results = [r['recall_at_10'] for r in results if r['recall_at_10'] is not None]
    
    print(f"\nSearch Quality:")
    print(f"  Average Distance Score: {avg_distance:.3f}")
    
    if precision_results:
        print(f"  Average Precision@10: {sum(precision_results)/len(precision_results):.1%}")
        print(f"  Average Recall@10: {sum(recall_results)/len(recall_results):.1%}")
    
    print(f"\nAI Response Quality:")
    print(f"  Average Factual Accuracy: {avg_factual:.1f}%")
    print(f"  Average Citation Verification Rate: {avg_citation:.1f}%")
    
    # === Results by Language ===
    print("\n" + "-" * 70)
    print("RESULTS BY LANGUAGE")
    print("-" * 70)
    
    for lang in ['english', 'tagalog', 'taglish']:
        lang_results = [r for r in results if r.get('language') == lang]
        if lang_results:
            lang_distances = [r['search_metrics']['avg_distance'] for r in lang_results if r['search_metrics']['avg_distance'] is not None]
            lang_recalls = [r['recall_at_10'] for r in lang_results if r['recall_at_10'] is not None]
            lang_factual = [r['factual_accuracy'] for r in lang_results]
            
            print(f"\n  {lang.upper()}:")
            if lang_distances:
                print(f"    Avg Distance: {sum(lang_distances)/len(lang_distances):.3f}")
            if lang_recalls:
                print(f"    Avg Recall@10: {sum(lang_recalls)/len(lang_recalls):.1%}")
            if lang_factual:
                print(f"    Avg Factual Accuracy: {sum(lang_factual)/len(lang_factual):.1f}%")

    print("\n" + "=" * 70)
    print("Benchmark Complete!")
    print("=" * 70)
    
    return results


if __name__ == "__main__":
    run_benchmark()
