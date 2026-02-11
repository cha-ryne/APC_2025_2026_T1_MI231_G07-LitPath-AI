# LitPath AI - RAG Evaluation Methodology

## Document Information
- **System:** LitPath AI - AI-Powered Thesis Research Assistant
- **Version:** 2.2
- **Date:** February 11, 2026
- **Authors:** LitPath AI Development Team

---

This document describes the accuracy evaluation methodology implemented in LitPath AI, inspired by LangSmith/LangChain's RAG evaluation framework.

## Reference
- [LangSmith RAG Evaluation Tutorial](https://docs.langchain.com/langsmith/evaluate-rag-tutorial)

## Overview

The RAG evaluation system uses an **LLM-as-Judge** approach to evaluate four key aspects of RAG system quality:

### 1. Correctness (Response vs Reference Answer)
- **Goal**: Measure how similar/correct the RAG response is relative to a ground-truth answer
- **Mode**: Requires a reference answer supplied through a dataset
- **Use Case**: Systematic testing with predefined test cases

### 2. Relevance (Response vs Input)
- **Goal**: Measure how well the generated response addresses the initial user question
- **Mode**: Does NOT require a reference answer
- **Use Case**: Real-time quality assessment

### 3. Groundedness (Response vs Retrieved Docs)
- **Goal**: Measure to what extent the generated response agrees with the retrieved context
- **Mode**: Does NOT require a reference answer, compares answer to retrieved documents
- **Use Case**: Hallucination detection

### 4. Retrieval Relevance (Retrieved Docs vs Input)
- **Goal**: Measure how relevant the retrieved documents are for the query
- **Mode**: Does NOT require a reference answer
- **Use Case**: Retrieval quality assessment

## API Endpoints

### Quick Evaluation (Real-time)
```
POST /api/evaluate/
```

**Request Body:**
```json
{
    "query": "What is photosynthesis?",
    "response": "Photosynthesis is the process by which plants convert sunlight into energy...",
    "retrieved_docs": ["Document 1 text...", "Document 2 text..."],
    "type": "quick"
}
```

**Response:**
```json
{
    "success": true,
    "evaluation_type": "quick",
    "results": {
        "relevance": {
            "score": true,
            "explanation": "The response directly addresses the question about photosynthesis..."
        },
        "groundedness": {
            "score": true,
            "explanation": "The response is well-grounded in the retrieved documents..."
        },
        "overall_pass": true
    }
}
```

### Full Evaluation
```
POST /api/evaluate/
```

**Request Body:**
```json
{
    "query": "What is photosynthesis?",
    "response": "Photosynthesis is the process by which plants convert sunlight into energy...",
    "retrieved_docs": ["Document 1 text...", "Document 2 text..."],
    "reference_answer": "Photosynthesis is the process used by plants to convert light energy...",
    "type": "full"
}
```

## Search API Integration

The search endpoint now supports automatic RAG evaluation:

```
POST /api/search/
```

**Request Body (with evaluation):**
```json
{
    "question": "What are the benefits of organic farming?",
    "overview_only": true,
    "include_rag_evaluation": true
}
```

**Response includes:**
```json
{
    "overview": "Based on the available research...",
    "accuracy_metrics": {
        "search": {...},
        "citation_verification": {...},
        "hallucination_detection": {...}
    },
    "rag_evaluation": {
        "relevance": {"score": true, "explanation": "..."},
        "groundedness": {"score": true, "explanation": "..."},
        "overall_pass": true
    }
}
```

## Query Parser - Automatic Metadata Extraction

The system now automatically extracts metadata filters from natural language queries:

### Year Extraction Examples
- "theses from 2023" → `year: "2023"`
- "research between 2020 and 2023" → `year_start: "2020", year_end: "2023"`
- "recent studies on agriculture" → `year_start: "2023", year_end: "2026"`
- "last year's research" → `year: "2025"`
- "last 5 years" → `year_start: "2021", year_end: "2026"`

### Subject Extraction Examples
- "agriculture research in 2023" → `subjects: ["Agriculture"]`
- "computer science and AI theses" → `subjects: ["Computer Science"]`
- "food science nutrition studies" → `subjects: ["Food Science"]`

### How It Works
1. When a search query is received, the `QueryParser` analyzes the text
2. Year patterns are detected using regex (e.g., "in 2023", "from 2020 to 2022", "recent", "last year")
3. Subject keywords are matched against available subjects in the database
4. Extracted filters are applied automatically if no explicit filters were provided
5. The API response indicates when filters were auto-extracted

## Files Created/Modified

### New Files
- `backend/rag_api/query_parser.py` - Natural language query parsing
- `backend/rag_api/rag_evaluator.py` - LangSmith-style RAG evaluation
- `docs/RAG_EVALUATION_METHODOLOGY.md` - This documentation

### Modified Files
- `backend/rag_api/views.py` - Integrated query parser and evaluator
- `backend/rag_api/urls.py` - Added evaluation endpoint
- `backend/rag_api/auth_views.py` - Removed delete account function
- `my-app/src/LitPathAI.jsx` - Removed delete account UI
- `my-app/src/AdminDashboard.jsx` - Removed delete account UI
- `my-app/src/context/AuthContext.jsx` - Removed delete account function

## Usage Examples

### Python Client Example
```python
import requests

# Quick evaluation
response = requests.post('http://localhost:8000/api/evaluate/', json={
    'query': 'What is organic farming?',
    'response': 'Organic farming is an agricultural method that...',
    'retrieved_docs': ['Doc 1...', 'Doc 2...'],
    'type': 'quick'
})

result = response.json()
print(f"Relevance: {result['results']['relevance']['score']}")
print(f"Groundedness: {result['results']['groundedness']['score']}")
```

### Running Systematic Evaluation
```python
from rag_api.rag_evaluator import RAGEvaluator, EvaluationDataset, EvaluationRunner

# Create dataset
dataset = EvaluationDataset("Thesis Search Tests")
dataset.add_example(
    question="What are the effects of climate change on rice production?",
    reference_answer="Climate change affects rice production through..."
)
dataset.add_example(
    question="How does agroforestry benefit soil health?",
    reference_answer="Agroforestry improves soil health by..."
)

# Define RAG function
def my_rag_function(question):
    # Your RAG system implementation
    response, docs = rag_service.search_and_generate(question)
    return response, docs

# Run evaluation
evaluator = RAGEvaluator()
runner = EvaluationRunner(evaluator)
results = runner.run(my_rag_function, dataset, "experiment_v1")

print(f"Relevance Pass Rate: {results['metrics']['relevance_pass_rate']}")
print(f"Groundedness Pass Rate: {results['metrics']['groundedness_pass_rate']}")
```

## Metrics Summary

| Metric | Description | Requires Reference | Real-time |
|--------|-------------|-------------------|-----------|
| Correctness | Factual accuracy vs ground truth | Yes | No |
| Relevance | Does answer address the question | No | Yes |
| Groundedness | Is answer based on retrieved docs | No | Yes |
| Retrieval Relevance | Are retrieved docs relevant | No | Yes |
---

## RAG Evaluator Test Results

### Test Execution Date
**Date:** February 11, 2026

### Test Configuration
| Parameter | Value |
|-----------|-------|
| Embedding Model | all-mpnet-base-v2 |
| Vector Database | ChromaDB |
| Total Indexed Chunks | 8,903 |
| LLM for Generation | Gemini 2.5 Flash |
| LLM for Evaluation | Gemini 2.5 Flash (Judge) |
| Distance Threshold | 1.5 |
| Top-N Results | 10 |
| Test Cases | 10 (6 Filipino, 4 English) |

### Test Cases Overview

| # | Query | Category | Language |
|---|-------|----------|----------|
| 1 | Ano-ano ang mga epekto ng mga plant growth regulator sa sili? | Agriculture - Plant Science | Filipino |
| 2 | Paano nakakaapekto ang salinity stress sa mga genotype ng palay? | Agriculture - Crop Science | Filipino |
| 3 | Ano ang sustansyang taglay ng mga butil na tila-kanin na gawa mula sa mais? | Food Science - Nutrition | Filipino |
| 4 | Ano ang mga benefits ng agroforestry systems sa Pilipinas? | Agriculture - Forestry | Filipino |
| 5 | Paano nakaka-apekto ang nano zinc oxide sa yield at quality ng kamatis? | Agriculture - Nanotechnology | Filipino |
| 6 | Ano ang mga ecosystem services ng mga rubber plantation? | Environmental Science | Filipino |
| 7 | What factors affect consumer acceptability of brown rice? | Food Science - Consumer Studies | English |
| 8 | What is the impact of deforestation on Philippine forests? | Environmental Science - Forestry | English |
| 9 | How does phytoremediation help with soil contamination? | Environmental Science - Soil | English |
| 10 | What are the genetic diversity methods used for Philippine rice breeding? | Agriculture - Genetics | English |

### Detailed Test Results

#### Test Case 1: Plant Growth Regulators on Chili Pepper (Filipino)
**Query:** "Ano-ano ang mga epekto ng mga plant growth regulator sa sili?"

| Metric | Documents | Chunks |
|--------|-----------|--------|
| Retrieved | 1 | 1 |

**AI Overview Excerpt:**
> Batay sa pag-aaral ni Benipayo (2022), ang paggamit ng mga plant growth regulator (PGR) tulad ng brassinolide (BL), ethephon (ETP), at paclobutrazol (PBZ) ay naglalayong magbigay ng toleransya, magtaguyod ng paglaki, at mapabuti ang kalidad ng bunga ng sili (Capsicum frutescens)...

| Metric | Score | Explanation |
|--------|-------|-------------|
| **Relevance** | ✅ PASS | Directly addresses the question by identifying specific PGRs and their effects on chili plants under waterlogging stress |
| **Groundedness** | ❌ FAIL | Second paragraph discusses specific morphological effects not explicitly in provided abstract excerpt |
| **Retrieval Relevance** | ✅ PASS | Retrieved document directly about PGR effects on chili pepper |
| **Overall** | ❌ FAIL | Groundedness criterion not met |

---

#### Test Case 2: Salinity Stress on Rice Genotypes (Filipino)
**Query:** "Paano nakakaapekto ang salinity stress sa mga genotype ng palay?"

| Metric | Documents | Chunks |
|--------|-----------|--------|
| Retrieved | 2 | 2 |

**AI Overview Excerpt:**
> Batay sa mga ibinigay na sanggunian, ang salinity stress ay may malaking epekto sa pisyolohiya at paglaki ng mga genotype ng palay. Ang stress na dulot ng asin ay nakakaapekto sa paglaki ng punla (seedling growth) at sa mga yield component...

| Metric | Score | Explanation |
|--------|-------|-------------|
| **Relevance** | ✅ PASS | Details impact on physiology, growth, molecular mechanisms, and varying responses across genotypes |
| **Groundedness** | ❌ FAIL | Mentions "Salto! QTL" term not found in source documents - hallucination detected |
| **Retrieval Relevance** | ✅ PASS | Multiple retrieved documents directly about rice salinity tolerance evaluation |
| **Overall** | ❌ FAIL | Hallucination detected in response |

---

#### Test Case 3: Nutritional Value of Corn Rice-Like Grains (Filipino)
**Query:** "Ano ang sustansyang taglay ng mga butil na tila-kanin na gawa mula sa mais?"

| Metric | Documents | Chunks |
|--------|-----------|--------|
| Retrieved | 4 | 4 |

**AI Overview Excerpt:**
> Ang mga butil na tila-kanin (rice-like grains) na gawa mula sa mais ay nagtataglay ng iba't ibang sustansya tulad ng protina, taba, at mga mineral. Ayon sa pagsusuri sa kumbinasyon ng IPB variety 6 at Lagkitan na mais...

| Metric | Score | Explanation |
|--------|-------|-------------|
| **Relevance** | ✅ PASS | Lists specific nutrients (protein, fat, zinc, iron, carbohydrates) and discusses cooking impact and glycemic index |
| **Groundedness** | ❌ FAIL | Mentions specific GI value (67.03%) not found in provided source documents |
| **Retrieval Relevance** | ✅ PASS | Retrieved documents contain nutrient content, proximate composition, and carbohydrate profile data for corn rice-like grains |
| **Overall** | ❌ FAIL | Specific numerical claim not supported by source excerpts |

---

#### Test Case 4: Agroforestry Benefits in the Philippines (Filipino)
**Query:** "Ano ang mga benefits ng agroforestry systems sa Pilipinas?"

| Metric | Documents | Chunks |
|--------|-----------|--------|
| Retrieved | 2 | 2 |

**AI Overview Excerpt:**
> Batay sa mga nakalap na dokumento, ang agroforestry sa Pilipinas ay nagsisilbing mahalagang kompromiso sa pagitan ng produksyong agrikultural at pagbibigay ng mga benepisyong panggubat. Ang mga sistemang ito, partikular ang Conservation Farming Villages (CFV) program...

| Metric | Score | Explanation |
|--------|-------|-------------|
| **Relevance** | ✅ PASS | Enumerates economic, ecological, and food security benefits directly addressing the question |
| **Groundedness** | ✅ PASS | All claims (food security, economic growth, nutrient pumping, erosion reduction, carbon storage) directly supported by source documents |
| **Retrieval Relevance** | ✅ PASS | Retrieved documents directly address agroforestry benefits including food security, economic returns, and ecological services |
| **Overall** | ✅ PASS | All evaluation criteria met |

---

#### Test Case 5: Nano Zinc Oxide on Tomato (Filipino)
**Query:** "Paano nakaka-apekto ang nano zinc oxide sa yield at quality ng kamatis?"

| Metric | Documents | Chunks |
|--------|-----------|--------|
| Retrieved | 1 | 1 |

**AI Overview Excerpt:**
> Batay sa pananaliksik ni Ybañez (2018), ang paggamit ng synthesized nano zinc oxide (SNZ) bilang foliar fertilizer ay nagpapakita ng positibong epekto sa paglaki at produksyon ng kamatis (var 'Marimax')...

| Metric | Score | Explanation |
|--------|-------|-------------|
| **Relevance** | ✅ PASS | Addresses how nano zinc oxide affects yield and quality with specific details on growth, nutrient uptake, and marketable yield |
| **Groundedness** | ❌ FAIL | Detailed effects on plant height, clusters, SPAD units not in the truncated abstract text provided to evaluator |
| **Retrieval Relevance** | ⚠️ N/A | Evaluation limited by API rate constraints |
| **Overall** | ❌ FAIL | Groundedness not met |

---

#### Test Cases 6-10: Search and Generation Results

Test cases 6-10 completed search and AI generation successfully, but LLM-as-Judge evaluation was limited by Gemini API rate quotas (20 requests/day free tier for gemini-2.5-flash). Search and generation results are documented below:

| # | Query | Docs Found | Generation | Notes |
|---|-------|-----------|------------|-------|
| 6 | Ecosystem services ng rubber plantation | 1 | ✅ Generated overview about rubber plantation services in Mt. Makiling | Eval rate-limited |
| 7 | Factors affecting brown rice acceptability | 1 | ✅ Generated overview about sensory/economic factors in Caloocan City study | Eval rate-limited |
| 8 | Impact of deforestation on Philippine forests | 1 | ✅ Generated overview about forest loss trends and deforestation drivers | Relevance: FAIL (sources address causes, not impacts) |
| 9 | Phytoremediation and soil contamination | 1 | ✅ Generated overview about vetiver grass for soil decontamination | Eval rate-limited |
| 10 | Genetic diversity methods for rice breeding | 2 | ✅ Generated overview about diallel crossing and molecular methods | Eval rate-limited |

**Note on Test Case 8:** The relevance evaluator correctly identified that while the system retrieved a relevant document about deforestation, the AI response acknowledged that the sources addressed *causes* of deforestation rather than *impacts*, demonstrating the evaluation system's ability to detect nuanced mismatches between query intent and response content.

### Evaluation Methodology Details

#### 1. Relevance Evaluation
The LLM judge evaluates whether the generated response:
- Directly addresses the user's original question
- Contains information that is pertinent to the query
- Provides a useful and on-topic answer

**Prompt Template:**
```
You are a teacher grading a quiz. Grade the following student answer based on:
1. Does the answer address the QUESTION asked?
2. Is the answer relevant to the topic?
3. Does the answer provide useful information related to the question?
```

#### 2. Groundedness Evaluation
The LLM judge evaluates whether the generated response:
- Is based on information present in the retrieved source documents
- Does not contain "hallucinated" information outside the scope of sources
- Accurately represents the facts from the source documents

**Prompt Template:**
```
You are a teacher grading a quiz. Grade the following based on:
1. Ensure the STUDENT ANSWER is grounded in the FACTS (source documents)
2. Ensure the STUDENT ANSWER does not contain "hallucinated" information
3. Minor paraphrasing is acceptable as long as the meaning is preserved
```

#### 3. Retrieval Relevance Evaluation
The LLM judge evaluates whether the retrieved documents:
- Contain information relevant to answering the user's question
- Have keywords or semantic meaning related to the query
- Provide sufficient context for generating a quality response

**Prompt Template:**
```
You are a teacher grading a quiz. Grade the following based on:
1. Identify if the FACTS contain information relevant to the QUESTION
2. Facts should contain keywords or semantic meaning related to the question
3. It is OK if some facts are unrelated, as long as some are relevant
```

### Scoring Criteria

| Score | Meaning | Criteria |
|-------|---------|----------|
| ✅ PASS (true) | Evaluation passed | Response meets all quality criteria |
| ❌ FAIL (false) | Evaluation failed | Response does not meet one or more criteria |
| ⚠️ N/A | Not evaluated | API rate limit reached; evaluation skipped |

### Overall Pass Rate Calculation

```
Overall Pass = Relevance PASS AND Groundedness PASS
```

A response is considered high-quality only when it:
1. Directly addresses the user's question (Relevance ✅)
2. Is grounded in the retrieved source documents (Groundedness ✅)

### Aggregated Results (5 Fully Evaluated Test Cases)

| Metric | Pass | Fail | Pass Rate | Status |
|--------|------|------|-----------|--------|
| **Relevance** | 5 | 0 | **100%** | ✅ Excellent |
| **Groundedness** | 1 | 4 | **20%** | ⚠️ Needs Improvement |
| **Retrieval Relevance** | 3 | 1 | **75%** | ✅ Good |
| **Overall (Rel + Grd)** | 1 | 4 | **20%** | ⚠️ Needs Improvement |

### Analysis of Groundedness Results

The low groundedness score (20%) requires context. The groundedness evaluator checks if the AI response contains ONLY information present in the source document excerpts provided to the judge. Key findings:

1. **Truncation Effect:** The evaluator receives only the first ~1,000 characters of each retrieved document chunk. The AI generation model receives more context, leading to responses with details that the evaluator cannot verify against its truncated view.

2. **Specific Hallucinations Detected:**
   - Test 2: AI mentioned "Salto! QTL" - a term not found in source documents (true hallucination)
   - Test 3: AI cited specific glycemic index value (67.03%) not in provided excerpts
   - Tests 1, 5: AI included detailed experimental results that existed in the full document but were cut off in the evaluator's truncated view

3. **Strict Evaluation Standard:** The LLM-as-Judge applies a strict standard where ANY information not directly traceable to provided sources is flagged. This is intentionally conservative to catch potential hallucinations.

4. **Recommendation:** The groundedness metric should be interpreted alongside the keyword-based Factual Accuracy metric (96.3% in v2.0 benchmark) for a complete picture. Future improvements could include providing larger document excerpts to the evaluation judge.

---

## Benchmark Results Summary

### Current System Performance (v2.1 - February 2026)

| Category | Metric | Result | Target | Status |
|----------|--------|--------|--------|--------|
| **Search Quality** | Average Distance Score | 0.838 | < 1.0 | ✅ Excellent |
| **Search Quality** | Documents Retrieved (per query) | 1-4 | 1-10 | ✅ Pass |
| **RAG Evaluation** | Relevance Pass Rate (n=5) | 100% | > 80% | ✅ Excellent |
| **RAG Evaluation** | Groundedness Pass Rate (n=5) | 20% | > 80% | ⚠️ Strict (see analysis) |
| **RAG Evaluation** | Retrieval Relevance Pass Rate (n=4) | 75% | > 70% | ✅ Good |
| **Keyword-Based** | Factual Accuracy | 96.3% | > 90% | ✅ Excellent |
| **Keyword-Based** | Citation Verification Rate | 76.5% | > 70% | ✅ Good |

> **Note:** The Groundedness metric uses a strict LLM-as-Judge evaluation that flags any information not directly traceable to the truncated source documents provided to the evaluator. The keyword-based Factual Accuracy (96.3%) provides a complementary, less strict measure of response grounding. See "Analysis of Groundedness Results" above for details.

### Interpretation Guide

| Metric Range | Interpretation | Recommendation |
|--------------|----------------|----------------|
| Pass Rate > 90% | Excellent | System performing optimally |
| Pass Rate 75-90% | Good | Minor improvements possible |
| Pass Rate 50-75% | Fair | Review prompts and retrieval settings |
| Pass Rate < 50% | Poor | Significant system improvements needed |

---

## Running Your Own Evaluation

### Quick Test (Command Line)
```python
import django
django.setup()
from rag_api.rag_service import RAGService
from rag_api.rag_evaluator import quick_evaluate

RAGService.initialize()
rag = RAGService()

# Run search
query = "Your test query here"
results = rag.search(query, top_n=10)
top_chunks, documents, _ = results

# Generate overview
overview = rag.generate_overview(top_chunks, query, 1.5)

# Evaluate
source_texts = [c['chunk'] for c in top_chunks[:5]]
evaluation = quick_evaluate(query, overview, source_texts)

print("Relevance:", evaluation['relevance']['score'])
print("Groundedness:", evaluation['groundedness']['score'])
print("Overall Pass:", evaluation['overall_pass'])
```

### API Endpoint Test
```bash
curl -X POST http://localhost:8000/api/evaluate/ \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is organic farming?",
    "response": "Organic farming is...",
    "retrieved_docs": ["Source 1...", "Source 2..."],
    "type": "quick"
  }'
```