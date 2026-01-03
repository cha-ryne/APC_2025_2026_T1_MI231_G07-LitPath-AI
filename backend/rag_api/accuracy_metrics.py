"""
LitPath AI - Comprehensive Accuracy Metrics Module

This module implements industry-standard accuracy measurements:
1. Precision@K - Search correctness
2. Recall@K - Search completeness  
3. ROUGE Score - Summary quality
4. Hallucination Detection - Factual accuracy

Author: LitPath AI Team
Date: December 2025
"""

import re
from typing import List, Dict, Optional, Tuple
from collections import Counter


class AccuracyMetrics:
    """Comprehensive accuracy measurement for RAG systems"""
    
    def __init__(self):
        self._rouge_scorer = None
        self._nli_pipeline = None
    
    # ============= Precision@K and Recall@K =============
    
    def calculate_precision_at_k(
        self, 
        retrieved_docs: List[str], 
        relevant_docs: List[str], 
        k: int = 10
    ) -> float:
        """
        Calculate Precision@K - What fraction of retrieved docs are relevant?
        
        Args:
            retrieved_docs: List of document filenames/IDs returned by search
            relevant_docs: List of document filenames/IDs that are truly relevant
            k: Number of top results to consider
            
        Returns:
            Precision@K score (0.0 to 1.0)
        """
        if k <= 0:
            return 0.0
        
        # Get top-k retrieved documents
        top_k = retrieved_docs[:k]
        
        if not top_k:
            return 0.0
        
        # Count how many are relevant
        relevant_set = set(relevant_docs)
        relevant_in_top_k = sum(1 for doc in top_k if doc in relevant_set)
        
        precision = relevant_in_top_k / len(top_k)
        return round(precision, 4)
    
    def calculate_recall_at_k(
        self, 
        retrieved_docs: List[str], 
        relevant_docs: List[str], 
        k: int = 10
    ) -> float:
        """
        Calculate Recall@K - What fraction of relevant docs were retrieved?
        
        Args:
            retrieved_docs: List of document filenames/IDs returned by search
            relevant_docs: List of document filenames/IDs that are truly relevant
            k: Number of top results to consider
            
        Returns:
            Recall@K score (0.0 to 1.0)
        """
        if not relevant_docs:
            return 0.0
        
        # Get top-k retrieved documents
        top_k = retrieved_docs[:k]
        
        if not top_k:
            return 0.0
        
        # Count how many relevant docs were retrieved
        relevant_set = set(relevant_docs)
        relevant_in_top_k = sum(1 for doc in top_k if doc in relevant_set)
        
        recall = relevant_in_top_k / len(relevant_docs)
        return round(recall, 4)
    
    def calculate_f1_at_k(
        self,
        retrieved_docs: List[str],
        relevant_docs: List[str],
        k: int = 10
    ) -> float:
        """
        Calculate F1@K - Harmonic mean of Precision@K and Recall@K
        
        Args:
            retrieved_docs: List of document filenames/IDs returned by search
            relevant_docs: List of document filenames/IDs that are truly relevant
            k: Number of top results to consider
            
        Returns:
            F1@K score (0.0 to 1.0)
        """
        precision = self.calculate_precision_at_k(retrieved_docs, relevant_docs, k)
        recall = self.calculate_recall_at_k(retrieved_docs, relevant_docs, k)
        
        if precision + recall == 0:
            return 0.0
        
        f1 = 2 * (precision * recall) / (precision + recall)
        return round(f1, 4)
    
    def calculate_precision_recall_metrics(
        self,
        retrieved_docs: List[str],
        relevant_docs: List[str],
        k_values: List[int] = [5, 10]
    ) -> Dict:
        """
        Calculate all precision/recall metrics for multiple K values
        
        Returns:
            Dictionary with precision, recall, and F1 at each K
        """
        results = {}
        
        for k in k_values:
            results[f"precision@{k}"] = self.calculate_precision_at_k(retrieved_docs, relevant_docs, k)
            results[f"recall@{k}"] = self.calculate_recall_at_k(retrieved_docs, relevant_docs, k)
            results[f"f1@{k}"] = self.calculate_f1_at_k(retrieved_docs, relevant_docs, k)
        
        return results
    
    # ============= ROUGE Score =============
    
    def _get_rouge_scorer(self):
        """Lazy load ROUGE scorer"""
        if self._rouge_scorer is None:
            try:
                from rouge_score import rouge_scorer
                self._rouge_scorer = rouge_scorer.RougeScorer(
                    ['rouge1', 'rouge2', 'rougeL'], 
                    use_stemmer=True
                )
            except ImportError:
                print("WARNING: rouge-score not installed. Run: pip install rouge-score")
                return None
        return self._rouge_scorer
    
    def calculate_rouge_scores(
        self, 
        generated_text: str, 
        reference_text: str
    ) -> Dict:
        """
        Calculate ROUGE scores comparing generated text to reference.
        
        ROUGE-1: Unigram overlap
        ROUGE-2: Bigram overlap
        ROUGE-L: Longest Common Subsequence
        
        Args:
            generated_text: AI-generated overview/summary
            reference_text: Human-written reference summary
            
        Returns:
            Dictionary with ROUGE-1, ROUGE-2, ROUGE-L precision, recall, F1
        """
        scorer = self._get_rouge_scorer()
        
        if scorer is None:
            return {
                "error": "rouge-score library not installed",
                "rouge1": {"precision": 0, "recall": 0, "f1": 0},
                "rouge2": {"precision": 0, "recall": 0, "f1": 0},
                "rougeL": {"precision": 0, "recall": 0, "f1": 0}
            }
        
        if not generated_text or not reference_text:
            return {
                "rouge1": {"precision": 0, "recall": 0, "f1": 0},
                "rouge2": {"precision": 0, "recall": 0, "f1": 0},
                "rougeL": {"precision": 0, "recall": 0, "f1": 0}
            }
        
        scores = scorer.score(reference_text, generated_text)
        
        return {
            "rouge1": {
                "precision": round(scores['rouge1'].precision, 4),
                "recall": round(scores['rouge1'].recall, 4),
                "f1": round(scores['rouge1'].fmeasure, 4)
            },
            "rouge2": {
                "precision": round(scores['rouge2'].precision, 4),
                "recall": round(scores['rouge2'].recall, 4),
                "f1": round(scores['rouge2'].fmeasure, 4)
            },
            "rougeL": {
                "precision": round(scores['rougeL'].precision, 4),
                "recall": round(scores['rougeL'].recall, 4),
                "f1": round(scores['rougeL'].fmeasure, 4)
            }
        }
    
    def calculate_rouge_summary(self, generated_text: str, reference_text: str) -> Dict:
        """
        Calculate simplified ROUGE summary (just F1 scores)
        
        Returns:
            Dictionary with ROUGE-1, ROUGE-2, ROUGE-L F1 scores
        """
        full_scores = self.calculate_rouge_scores(generated_text, reference_text)
        
        if "error" in full_scores:
            return full_scores
        
        return {
            "rouge1_f1": full_scores["rouge1"]["f1"],
            "rouge2_f1": full_scores["rouge2"]["f1"],
            "rougeL_f1": full_scores["rougeL"]["f1"],
            "average_f1": round(
                (full_scores["rouge1"]["f1"] + 
                 full_scores["rouge2"]["f1"] + 
                 full_scores["rougeL"]["f1"]) / 3, 
                4
            )
        }
    
    # ============= Hallucination Detection =============
    
    def _get_nli_pipeline(self):
        """Lazy load NLI pipeline for hallucination detection"""
        if self._nli_pipeline is None:
            try:
                from transformers import pipeline
                print("[Accuracy] Loading NLI model for hallucination detection...")
                self._nli_pipeline = pipeline(
                    "text-classification",
                    model="facebook/bart-large-mnli",
                    device=-1  # CPU, use 0 for GPU
                )
                print("[Accuracy] NLI model loaded successfully")
            except ImportError:
                print("WARNING: transformers not installed. Run: pip install transformers")
                return None
            except Exception as e:
                print(f"WARNING: Could not load NLI model: {e}")
                return None
        return self._nli_pipeline
    
    def detect_hallucinations_nli(
        self, 
        generated_text: str, 
        source_texts: List[str],
        threshold: float = 0.5
    ) -> Dict:
        """
        Detect hallucinations using Natural Language Inference (NLI).
        
        Checks if each sentence in generated text is entailed by source texts.
        
        Args:
            generated_text: AI-generated overview
            source_texts: List of source document texts
            threshold: Confidence threshold for entailment
            
        Returns:
            Dictionary with hallucination analysis
        """
        nli = self._get_nli_pipeline()
        
        if nli is None:
            # Fallback to keyword-based detection
            return self.detect_hallucinations_keyword(generated_text, source_texts)
        
        # Combine source texts (truncate to avoid token limits)
        combined_source = " ".join(source_texts)[:4000]
        
        # Split generated text into sentences
        sentences = self._split_into_sentences(generated_text)
        
        results = []
        hallucinated_count = 0
        
        for sentence in sentences:
            if len(sentence.strip()) < 20:  # Skip very short sentences
                continue
            
            try:
                # NLI input format: "premise [SEP] hypothesis"
                # We check if source (premise) entails generated sentence (hypothesis)
                result = nli(f"{combined_source[:1000]} [SEP] {sentence}")
                
                label = result[0]['label']
                score = result[0]['score']
                
                is_hallucination = label == 'contradiction' or (label == 'neutral' and score > 0.8)
                
                if is_hallucination:
                    hallucinated_count += 1
                
                results.append({
                    "sentence": sentence[:100] + "..." if len(sentence) > 100 else sentence,
                    "nli_label": label,
                    "confidence": round(score, 4),
                    "is_hallucination": is_hallucination
                })
            except Exception as e:
                results.append({
                    "sentence": sentence[:50] + "...",
                    "error": str(e)
                })
        
        total_sentences = len(results)
        hallucination_rate = (hallucinated_count / total_sentences * 100) if total_sentences > 0 else 0
        
        return {
            "method": "NLI",
            "total_sentences": total_sentences,
            "hallucinated_sentences": hallucinated_count,
            "hallucination_rate": round(hallucination_rate, 2),
            "factual_accuracy": round(100 - hallucination_rate, 2),
            "details": results
        }
    
    def detect_hallucinations_keyword(
        self, 
        generated_text: str, 
        source_texts: List[str],
        min_overlap_ratio: float = 0.3
    ) -> Dict:
        """
        Detect hallucinations using keyword overlap (faster, no ML model).
        
        Checks if key terms in generated text appear in sources.
        
        Args:
            generated_text: AI-generated overview
            source_texts: List of source document texts
            min_overlap_ratio: Minimum keyword overlap to consider grounded
            
        Returns:
            Dictionary with hallucination analysis
        """
        # Combine and tokenize source texts
        combined_source = " ".join(source_texts).lower()
        source_words = set(self._extract_keywords(combined_source))
        
        # Split into sentences
        sentences = self._split_into_sentences(generated_text)
        
        results = []
        hallucinated_count = 0
        
        for sentence in sentences:
            if len(sentence.strip()) < 20:
                continue
            
            sentence_keywords = set(self._extract_keywords(sentence.lower()))
            
            if not sentence_keywords:
                continue
            
            # Calculate overlap
            overlap = sentence_keywords & source_words
            overlap_ratio = len(overlap) / len(sentence_keywords) if sentence_keywords else 0
            
            is_hallucination = overlap_ratio < min_overlap_ratio
            
            if is_hallucination:
                hallucinated_count += 1
            
            results.append({
                "sentence": sentence[:100] + "..." if len(sentence) > 100 else sentence,
                "overlap_ratio": round(overlap_ratio, 4),
                "keywords_found": len(overlap),
                "total_keywords": len(sentence_keywords),
                "is_hallucination": is_hallucination
            })
        
        total_sentences = len(results)
        hallucination_rate = (hallucinated_count / total_sentences * 100) if total_sentences > 0 else 0
        
        return {
            "method": "keyword_overlap",
            "total_sentences": total_sentences,
            "hallucinated_sentences": hallucinated_count,
            "hallucination_rate": round(hallucination_rate, 2),
            "factual_accuracy": round(100 - hallucination_rate, 2),
            "min_overlap_threshold": min_overlap_ratio,
            "details": results
        }
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        # Remove citations like [1], [2]
        text = re.sub(r'\[\d+\]', '', text)
        
        # Split on sentence boundaries
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Clean up
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text"""
        # Remove punctuation and split
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Remove common stop words
        stop_words = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'shall',
            'can', 'need', 'dare', 'ought', 'used', 'for', 'with', 
            'from', 'into', 'through', 'during', 'before', 'after',
            'above', 'below', 'between', 'under', 'again', 'further',
            'then', 'once', 'and', 'but', 'nor', 'yet', 'both',
            'either', 'neither', 'not', 'only', 'own', 'same', 'than',
            'too', 'very', 'just', 'also', 'now', 'here', 'there',
            'when', 'where', 'why', 'how', 'all', 'each', 'every',
            'few', 'more', 'most', 'other', 'some', 'such', 'any',
            'this', 'that', 'these', 'those', 'its', 'about', 'which',
            'their', 'them', 'they', 'what', 'been', 'being', 'while'
        }
        
        keywords = [w for w in words if w not in stop_words]
        
        return keywords
    
    # ============= Comprehensive Evaluation =============
    
    def evaluate_search(
        self,
        retrieved_docs: List[str],
        relevant_docs: List[str],
        distance_scores: List[float] = None
    ) -> Dict:
        """
        Comprehensive search evaluation combining all metrics
        
        Returns:
            Dictionary with precision, recall, F1 at K=5 and K=10
        """
        metrics = self.calculate_precision_recall_metrics(
            retrieved_docs, 
            relevant_docs, 
            k_values=[5, 10]
        )
        
        # Add distance score statistics if available
        if distance_scores:
            metrics["distance_stats"] = {
                "avg": round(sum(distance_scores) / len(distance_scores), 4) if distance_scores else None,
                "min": round(min(distance_scores), 4) if distance_scores else None,
                "max": round(max(distance_scores), 4) if distance_scores else None
            }
        
        return metrics
    
    def evaluate_generation(
        self,
        generated_text: str,
        source_texts: List[str],
        reference_text: str = None,
        use_nli: bool = False
    ) -> Dict:
        """
        Comprehensive generation evaluation combining all metrics
        
        Args:
            generated_text: AI-generated overview
            source_texts: Source documents used for generation
            reference_text: Optional human-written reference for ROUGE
            use_nli: Whether to use NLI model for hallucination detection
            
        Returns:
            Dictionary with hallucination and optionally ROUGE metrics
        """
        results = {}
        
        # Hallucination detection
        if use_nli:
            results["hallucination"] = self.detect_hallucinations_nli(
                generated_text, source_texts
            )
        else:
            results["hallucination"] = self.detect_hallucinations_keyword(
                generated_text, source_texts
            )
        
        # ROUGE scores if reference provided
        if reference_text:
            results["rouge"] = self.calculate_rouge_summary(
                generated_text, reference_text
            )
        
        return results


# Singleton instance for easy access
accuracy_metrics = AccuracyMetrics()
