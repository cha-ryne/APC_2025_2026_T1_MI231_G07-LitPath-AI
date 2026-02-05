"""
LitPath AI - LangSmith-style RAG Evaluation Module

This module implements RAG evaluation methodology inspired by LangSmith/LangChain:
1. Correctness - Response vs reference answer (LLM-as-judge)
2. Relevance - Response vs input (LLM-as-judge)
3. Groundedness - Response vs retrieved docs (LLM-as-judge)
4. Retrieval Relevance - Retrieved docs vs input (LLM-as-judge)

Reference: https://docs.langchain.com/langsmith/evaluate-rag-tutorial

Author: LitPath AI Team
Date: February 2026
"""

import os
import json
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from google import genai


@dataclass
class EvaluationResult:
    """Result from an evaluation"""
    metric_name: str
    score: bool  # True/False for pass/fail
    explanation: str
    confidence: float = 1.0
    metadata: Dict = None
    
    def to_dict(self):
        return asdict(self)


@dataclass
class RAGEvaluationReport:
    """Complete evaluation report for a RAG response"""
    query: str
    response: str
    retrieved_docs: List[str]
    timestamp: str
    correctness: Optional[EvaluationResult] = None
    relevance: Optional[EvaluationResult] = None
    groundedness: Optional[EvaluationResult] = None
    retrieval_relevance: Optional[EvaluationResult] = None
    overall_score: float = 0.0
    
    def to_dict(self):
        return {
            'query': self.query,
            'response': self.response[:500] + '...' if len(self.response) > 500 else self.response,
            'num_retrieved_docs': len(self.retrieved_docs),
            'timestamp': self.timestamp,
            'correctness': self.correctness.to_dict() if self.correctness else None,
            'relevance': self.relevance.to_dict() if self.relevance else None,
            'groundedness': self.groundedness.to_dict() if self.groundedness else None,
            'retrieval_relevance': self.retrieval_relevance.to_dict() if self.retrieval_relevance else None,
            'overall_score': self.overall_score
        }


class LLMJudge:
    """
    LLM-as-Judge for RAG evaluation.
    Uses Gemini API to evaluate response quality.
    """
    
    def __init__(self, api_key: str = None, model: str = "gemini-2.5-flash-lite"):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.model = model
        self.client = None
        
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
    
    def _call_llm(self, prompt: str, max_tokens: int = 512) -> str:
        """Call the LLM with a prompt"""
        if not self.client:
            raise ValueError("No API key configured for LLM judge")
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "temperature": 0.1,  # Low temperature for consistent evaluation
                    "max_output_tokens": max_tokens,
                    "top_p": 0.9,
                    "thinking_config": {"thinking_budget": 0},
                }
            )
            return response.text.strip()
        except Exception as e:
            print(f"[RAG-Eval] LLM call failed: {e}")
            return ""
    
    def _parse_json_response(self, response: str) -> Dict:
        """Parse JSON from LLM response"""
        try:
            # Try to find JSON in the response
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
        
        # Fallback: try to parse the whole response
        try:
            return json.loads(response)
        except:
            return {"error": "Failed to parse response", "raw": response[:200]}
    
    def evaluate_correctness(
        self, 
        question: str, 
        response: str, 
        reference_answer: str
    ) -> EvaluationResult:
        """
        Evaluate correctness: Is the response factually accurate compared to the reference?
        
        This requires a ground truth (reference) answer.
        """
        prompt = f"""You are a teacher grading a quiz. You will be given a QUESTION, the GROUND TRUTH (correct) ANSWER, and the STUDENT ANSWER.

Grade criteria:
1. Grade the student answer based ONLY on factual accuracy relative to the ground truth.
2. Ensure the student answer does not contain conflicting statements.
3. It is OK if the student answer contains more information than ground truth, as long as it is factually accurate.

QUESTION: {question}

GROUND TRUTH ANSWER: {reference_answer}

STUDENT ANSWER: {response}

Respond with a JSON object:
{{
    "explanation": "Your step-by-step reasoning",
    "correct": true or false
}}"""
        
        llm_response = self._call_llm(prompt)
        parsed = self._parse_json_response(llm_response)
        
        return EvaluationResult(
            metric_name="correctness",
            score=parsed.get("correct", False),
            explanation=parsed.get("explanation", "Unable to evaluate"),
            confidence=1.0 if "correct" in parsed else 0.0
        )
    
    def evaluate_relevance(self, question: str, response: str) -> EvaluationResult:
        """
        Evaluate relevance: Does the response address the user's question?
        
        This does NOT require a reference answer.
        """
        prompt = f"""You are a teacher grading a quiz. You will be given a QUESTION and a STUDENT ANSWER.

Grade criteria:
1. Ensure the STUDENT ANSWER is concise and relevant to the QUESTION
2. Ensure the STUDENT ANSWER helps to answer the QUESTION
3. The answer should directly address what was asked

QUESTION: {question}

STUDENT ANSWER: {response}

Respond with a JSON object:
{{
    "explanation": "Your step-by-step reasoning for the relevance score",
    "relevant": true or false
}}"""
        
        llm_response = self._call_llm(prompt)
        parsed = self._parse_json_response(llm_response)
        
        return EvaluationResult(
            metric_name="relevance",
            score=parsed.get("relevant", False),
            explanation=parsed.get("explanation", "Unable to evaluate"),
            confidence=1.0 if "relevant" in parsed else 0.0
        )
    
    def evaluate_groundedness(
        self, 
        response: str, 
        retrieved_docs: List[str]
    ) -> EvaluationResult:
        """
        Evaluate groundedness: Is the response based on/supported by the retrieved documents?
        
        This checks for hallucinations - claims not supported by source documents.
        """
        # Combine and truncate documents
        docs_text = "\n\n---\n\n".join(doc[:1000] for doc in retrieved_docs[:5])
        if len(docs_text) > 4000:
            docs_text = docs_text[:4000] + "..."
        
        prompt = f"""You are a teacher grading a quiz. You will be given FACTS (source documents) and a STUDENT ANSWER.

Grade criteria:
1. Ensure the STUDENT ANSWER is grounded in the FACTS
2. Ensure the STUDENT ANSWER does not contain "hallucinated" information outside the scope of the FACTS
3. Minor paraphrasing is acceptable as long as the meaning is preserved

SOURCE DOCUMENTS (FACTS):
{docs_text}

STUDENT ANSWER: {response}

Respond with a JSON object:
{{
    "explanation": "Your step-by-step reasoning about whether the answer is grounded in the facts",
    "grounded": true or false
}}"""
        
        llm_response = self._call_llm(prompt)
        parsed = self._parse_json_response(llm_response)
        
        return EvaluationResult(
            metric_name="groundedness",
            score=parsed.get("grounded", False),
            explanation=parsed.get("explanation", "Unable to evaluate"),
            confidence=1.0 if "grounded" in parsed else 0.0
        )
    
    def evaluate_retrieval_relevance(
        self, 
        question: str, 
        retrieved_docs: List[str]
    ) -> EvaluationResult:
        """
        Evaluate retrieval relevance: Are the retrieved documents relevant to the question?
        
        This evaluates the quality of the retrieval step.
        """
        # Combine and truncate documents
        docs_text = "\n\n---\n\n".join(doc[:800] for doc in retrieved_docs[:5])
        if len(docs_text) > 3500:
            docs_text = docs_text[:3500] + "..."
        
        prompt = f"""You are a teacher grading a quiz. You will be given a QUESTION and a set of FACTS (retrieved documents).

Grade criteria:
1. Your goal is to identify if the FACTS contain information relevant to answering the QUESTION
2. If the facts contain ANY keywords or semantic meaning related to the question, consider them relevant
3. It is OK if some facts have information unrelated to the question, as long as some are relevant

QUESTION: {question}

RETRIEVED DOCUMENTS (FACTS):
{docs_text}

Respond with a JSON object:
{{
    "explanation": "Your step-by-step reasoning about document relevance",
    "relevant": true or false
}}"""
        
        llm_response = self._call_llm(prompt)
        parsed = self._parse_json_response(llm_response)
        
        return EvaluationResult(
            metric_name="retrieval_relevance",
            score=parsed.get("relevant", False),
            explanation=parsed.get("explanation", "Unable to evaluate"),
            confidence=1.0 if "relevant" in parsed else 0.0
        )


class RAGEvaluator:
    """
    Complete RAG evaluation system implementing LangSmith-style methodology.
    
    Evaluates:
    1. Correctness - Response vs reference answer
    2. Relevance - Response vs input  
    3. Groundedness - Response vs retrieved docs
    4. Retrieval Relevance - Retrieved docs vs input
    """
    
    def __init__(self, api_key: str = None):
        self.judge = LLMJudge(api_key=api_key)
        self._evaluation_cache = {}
        self._cache_max_size = 100
    
    def _get_cache_key(self, query: str, response: str) -> str:
        """Generate cache key for evaluation results"""
        content = f"{query}|{response[:500]}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def evaluate(
        self,
        query: str,
        response: str,
        retrieved_docs: List[str],
        reference_answer: str = None,
        skip_correctness: bool = True,  # Skip by default since we rarely have reference answers
        skip_retrieval_relevance: bool = False
    ) -> RAGEvaluationReport:
        """
        Perform complete RAG evaluation.
        
        Args:
            query: The user's question
            response: The AI-generated response
            retrieved_docs: List of retrieved document chunks
            reference_answer: Optional ground truth answer for correctness evaluation
            skip_correctness: Skip correctness if no reference answer
            skip_retrieval_relevance: Skip retrieval relevance evaluation
            
        Returns:
            RAGEvaluationReport with all evaluation results
        """
        report = RAGEvaluationReport(
            query=query,
            response=response,
            retrieved_docs=retrieved_docs,
            timestamp=datetime.now().isoformat()
        )
        
        scores = []
        
        # 1. Correctness (only if reference answer provided)
        if reference_answer and not skip_correctness:
            try:
                report.correctness = self.judge.evaluate_correctness(
                    query, response, reference_answer
                )
                scores.append(1.0 if report.correctness.score else 0.0)
            except Exception as e:
                print(f"[RAG-Eval] Correctness evaluation failed: {e}")
        
        # 2. Relevance (does response address the question?)
        try:
            report.relevance = self.judge.evaluate_relevance(query, response)
            scores.append(1.0 if report.relevance.score else 0.0)
        except Exception as e:
            print(f"[RAG-Eval] Relevance evaluation failed: {e}")
        
        # 3. Groundedness (is response based on retrieved docs?)
        if retrieved_docs:
            try:
                report.groundedness = self.judge.evaluate_groundedness(
                    response, retrieved_docs
                )
                scores.append(1.0 if report.groundedness.score else 0.0)
            except Exception as e:
                print(f"[RAG-Eval] Groundedness evaluation failed: {e}")
        
        # 4. Retrieval Relevance (are docs relevant to question?)
        if retrieved_docs and not skip_retrieval_relevance:
            try:
                report.retrieval_relevance = self.judge.evaluate_retrieval_relevance(
                    query, retrieved_docs
                )
                scores.append(1.0 if report.retrieval_relevance.score else 0.0)
            except Exception as e:
                print(f"[RAG-Eval] Retrieval relevance evaluation failed: {e}")
        
        # Calculate overall score
        if scores:
            report.overall_score = sum(scores) / len(scores)
        
        return report
    
    def evaluate_quick(
        self,
        query: str,
        response: str,
        retrieved_docs: List[str]
    ) -> Dict:
        """
        Quick evaluation returning just key metrics.
        Suitable for real-time evaluation during search.
        """
        try:
            # Only evaluate relevance and groundedness for speed
            relevance = self.judge.evaluate_relevance(query, response)
            groundedness = self.judge.evaluate_groundedness(response, retrieved_docs) if retrieved_docs else None
            
            return {
                "relevance": {
                    "score": relevance.score,
                    "explanation": relevance.explanation[:200] if relevance.explanation else ""
                },
                "groundedness": {
                    "score": groundedness.score if groundedness else None,
                    "explanation": groundedness.explanation[:200] if groundedness and groundedness.explanation else ""
                } if groundedness else None,
                "overall_pass": relevance.score and (groundedness.score if groundedness else True)
            }
        except Exception as e:
            print(f"[RAG-Eval] Quick evaluation failed: {e}")
            return {
                "error": str(e),
                "relevance": None,
                "groundedness": None,
                "overall_pass": None
            }


class EvaluationDataset:
    """
    Manage evaluation datasets for systematic RAG testing.
    
    Datasets contain:
    - questions: User queries
    - reference_answers: Ground truth answers (optional)
    - expected_docs: Expected relevant documents (optional)
    """
    
    def __init__(self, name: str, examples: List[Dict] = None):
        self.name = name
        self.examples = examples or []
        self.created_at = datetime.now().isoformat()
    
    def add_example(
        self,
        question: str,
        reference_answer: str = None,
        expected_docs: List[str] = None,
        metadata: Dict = None
    ):
        """Add an example to the dataset"""
        self.examples.append({
            "id": len(self.examples) + 1,
            "question": question,
            "reference_answer": reference_answer,
            "expected_docs": expected_docs or [],
            "metadata": metadata or {}
        })
    
    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "created_at": self.created_at,
            "num_examples": len(self.examples),
            "examples": self.examples
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'EvaluationDataset':
        dataset = cls(name=data.get("name", "unknown"))
        dataset.examples = data.get("examples", [])
        dataset.created_at = data.get("created_at", datetime.now().isoformat())
        return dataset


class EvaluationRunner:
    """
    Run systematic evaluations on a RAG system using a dataset.
    Similar to LangSmith's evaluate() function.
    """
    
    def __init__(self, evaluator: RAGEvaluator):
        self.evaluator = evaluator
        self.results = []
    
    def run(
        self,
        rag_function,  # Function that takes a question and returns (response, retrieved_docs)
        dataset: EvaluationDataset,
        experiment_name: str = None
    ) -> Dict:
        """
        Run evaluation on a dataset.
        
        Args:
            rag_function: Function that takes question and returns (response, retrieved_docs)
            dataset: EvaluationDataset with test examples
            experiment_name: Optional name for this evaluation run
            
        Returns:
            Dictionary with aggregated results
        """
        self.results = []
        
        for example in dataset.examples:
            question = example["question"]
            reference_answer = example.get("reference_answer")
            
            try:
                # Run RAG system
                response, retrieved_docs = rag_function(question)
                
                # Evaluate
                report = self.evaluator.evaluate(
                    query=question,
                    response=response,
                    retrieved_docs=retrieved_docs,
                    reference_answer=reference_answer,
                    skip_correctness=(reference_answer is None)
                )
                
                self.results.append({
                    "example_id": example.get("id"),
                    "question": question,
                    "report": report.to_dict()
                })
                
            except Exception as e:
                self.results.append({
                    "example_id": example.get("id"),
                    "question": question,
                    "error": str(e)
                })
        
        # Aggregate results
        return self._aggregate_results(experiment_name)
    
    def _aggregate_results(self, experiment_name: str = None) -> Dict:
        """Aggregate evaluation results"""
        total = len(self.results)
        successful = [r for r in self.results if "report" in r]
        
        if not successful:
            return {
                "experiment_name": experiment_name,
                "total_examples": total,
                "successful_evaluations": 0,
                "error": "No successful evaluations"
            }
        
        # Calculate metrics
        relevance_scores = [
            r["report"]["relevance"]["score"] 
            for r in successful 
            if r["report"].get("relevance")
        ]
        
        groundedness_scores = [
            r["report"]["groundedness"]["score"]
            for r in successful
            if r["report"].get("groundedness")
        ]
        
        retrieval_scores = [
            r["report"]["retrieval_relevance"]["score"]
            for r in successful
            if r["report"].get("retrieval_relevance")
        ]
        
        overall_scores = [
            r["report"]["overall_score"]
            for r in successful
        ]
        
        return {
            "experiment_name": experiment_name or f"eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "total_examples": total,
            "successful_evaluations": len(successful),
            "failed_evaluations": total - len(successful),
            "metrics": {
                "relevance_pass_rate": sum(relevance_scores) / len(relevance_scores) if relevance_scores else None,
                "groundedness_pass_rate": sum(groundedness_scores) / len(groundedness_scores) if groundedness_scores else None,
                "retrieval_relevance_pass_rate": sum(retrieval_scores) / len(retrieval_scores) if retrieval_scores else None,
                "average_overall_score": sum(overall_scores) / len(overall_scores) if overall_scores else None
            },
            "details": self.results
        }


# Singleton instances for easy access
_evaluator = None


def get_rag_evaluator(api_key: str = None) -> RAGEvaluator:
    """Get or create RAG evaluator singleton"""
    global _evaluator
    if _evaluator is None:
        _evaluator = RAGEvaluator(api_key=api_key)
    return _evaluator


def evaluate_rag_response(
    query: str,
    response: str,
    retrieved_docs: List[str],
    api_key: str = None
) -> Dict:
    """
    Convenience function to evaluate a single RAG response.
    
    Returns a dictionary with evaluation results.
    """
    evaluator = get_rag_evaluator(api_key)
    report = evaluator.evaluate(query, response, retrieved_docs)
    return report.to_dict()


def quick_evaluate(
    query: str,
    response: str,
    retrieved_docs: List[str],
    api_key: str = None
) -> Dict:
    """
    Quick evaluation for real-time use.
    
    Returns a simplified dictionary with key metrics.
    """
    evaluator = get_rag_evaluator(api_key)
    return evaluator.evaluate_quick(query, response, retrieved_docs)
