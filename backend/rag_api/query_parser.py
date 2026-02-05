"""
Query Parser - Extract metadata filters from natural language queries

This module parses user queries to extract:
- Year filters (specific years, year ranges, relative dates)
- Subject filters (academic topics/fields)

The extracted filters are then applied to the search without requiring
explicit filter UI selections.
"""

import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple


class QueryParser:
    """Parse natural language queries to extract metadata filters"""
    
    def __init__(self):
        self.current_year = datetime.now().year
        
        # Common academic subjects/topics that might appear in queries
        self.subject_keywords = {
            'agriculture': ['agriculture', 'farming', 'crop', 'crops', 'agricultural', 'agronomy', 'plant cultivation', 'farm'],
            'agroforestry': ['agroforestry', 'forest farming', 'tree farming'],
            'biology': ['biology', 'biological', 'organism', 'organisms', 'life science', 'bioscience'],
            'biotechnology': ['biotechnology', 'biotech', 'genetic engineering', 'bioinformatics'],
            'chemistry': ['chemistry', 'chemical', 'biochemistry', 'organic chemistry', 'inorganic'],
            'computer science': ['computer science', 'computing', 'programming', 'software', 'algorithm', 'machine learning', 'artificial intelligence', 'ai', 'data science'],
            'ecology': ['ecology', 'ecosystem', 'environmental', 'environment', 'conservation'],
            'economics': ['economics', 'economic', 'economy', 'financial', 'finance', 'market'],
            'education': ['education', 'educational', 'teaching', 'learning', 'pedagogy', 'curriculum'],
            'engineering': ['engineering', 'engineer', 'mechanical', 'electrical', 'civil engineering'],
            'food science': ['food science', 'food technology', 'nutrition', 'nutritional', 'food processing', 'food safety'],
            'genetics': ['genetics', 'genetic', 'gene', 'genes', 'dna', 'genome', 'genomics'],
            'health': ['health', 'healthcare', 'medical', 'medicine', 'clinical', 'disease', 'therapeutic'],
            'horticulture': ['horticulture', 'horticultural', 'garden', 'ornamental plants', 'floriculture'],
            'mathematics': ['mathematics', 'mathematical', 'statistics', 'statistical', 'calculus'],
            'microbiology': ['microbiology', 'microbiological', 'bacteria', 'virus', 'microorganism'],
            'physics': ['physics', 'physical', 'quantum', 'mechanics'],
            'plant science': ['plant science', 'botany', 'botanical', 'plant biology', 'phytology'],
            'psychology': ['psychology', 'psychological', 'cognitive', 'behavior', 'mental health'],
            'social science': ['social science', 'sociology', 'sociological', 'anthropology', 'social studies'],
            'veterinary': ['veterinary', 'animal health', 'animal science', 'livestock'],
            'zoology': ['zoology', 'zoological', 'animal biology', 'fauna'],
        }
        
        # Build reverse lookup: keyword -> subject
        self.keyword_to_subject = {}
        for subject, keywords in self.subject_keywords.items():
            for kw in keywords:
                self.keyword_to_subject[kw.lower()] = subject
    
    def parse_query(self, query: str, available_subjects: List[str] = None) -> Dict:
        """
        Parse a natural language query to extract metadata filters.
        
        Args:
            query: The user's search query
            available_subjects: List of subjects available in the database
            
        Returns:
            Dictionary with extracted filters and cleaned query
        """
        query_lower = query.lower()
        
        # Extract year filters
        year_filters = self._extract_year_filters(query_lower)
        
        # Extract subject filters
        subject_filters = self._extract_subject_filters(query_lower, available_subjects)
        
        # Clean the query by removing filter phrases
        cleaned_query = self._clean_query(query, year_filters, subject_filters)
        
        return {
            'original_query': query,
            'cleaned_query': cleaned_query,
            'year': year_filters.get('year'),
            'year_start': year_filters.get('year_start'),
            'year_end': year_filters.get('year_end'),
            'subjects': subject_filters.get('subjects', []),
            'extracted_filters': {
                'year_phrases': year_filters.get('matched_phrases', []),
                'subject_phrases': subject_filters.get('matched_phrases', [])
            }
        }
    
    def _extract_year_filters(self, query: str) -> Dict:
        """Extract year filters from query"""
        result = {
            'year': None,
            'year_start': None,
            'year_end': None,
            'matched_phrases': []
        }
        
        # Pattern: "from 2020 to 2023", "2020-2023", "between 2020 and 2023"
        range_patterns = [
            r'from\s+(\d{4})\s+to\s+(\d{4})',
            r'between\s+(\d{4})\s+and\s+(\d{4})',
            r'(\d{4})\s*[-–]\s*(\d{4})',
            r'(\d{4})\s+to\s+(\d{4})',
        ]
        
        for pattern in range_patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                start_year = int(match.group(1))
                end_year = int(match.group(2))
                if 1900 <= start_year <= self.current_year + 1 and 1900 <= end_year <= self.current_year + 1:
                    result['year_start'] = str(start_year)
                    result['year_end'] = str(end_year)
                    result['matched_phrases'].append(match.group(0))
                    return result
        
        # Pattern: "in 2023", "published 2022", "year 2021", single year
        single_year_patterns = [
            r'(?:in|from|year|published|published in)\s+(\d{4})',
            r'\b(\d{4})\b(?:\s+(?:thesis|theses|study|studies|research|paper|papers))?',
        ]
        
        for pattern in single_year_patterns:
            matches = re.findall(pattern, query, re.IGNORECASE)
            for year_str in matches:
                year = int(year_str)
                if 1990 <= year <= self.current_year + 1:
                    result['year'] = str(year)
                    # Find the full match for the phrase
                    full_match = re.search(rf'(?:in|from|year|published|published in)?\s*{year}', query, re.IGNORECASE)
                    if full_match:
                        result['matched_phrases'].append(full_match.group(0).strip())
                    return result
        
        # Pattern: "recent", "latest", "new" -> last 3 years
        if any(word in query for word in ['recent', 'latest', 'newest', 'new research', 'recent research', 'recent studies']):
            result['year_start'] = str(self.current_year - 3)
            result['year_end'] = str(self.current_year)
            for word in ['recent', 'latest', 'newest', 'new research', 'recent research', 'recent studies']:
                if word in query:
                    result['matched_phrases'].append(word)
                    break
            return result
        
        # Pattern: "last year" -> previous year
        if 'last year' in query:
            result['year'] = str(self.current_year - 1)
            result['matched_phrases'].append('last year')
            return result
        
        # Pattern: "this year" -> current year
        if 'this year' in query:
            result['year'] = str(self.current_year)
            result['matched_phrases'].append('this year')
            return result
        
        # Pattern: "last X years", "past X years"
        last_years_match = re.search(r'(?:last|past)\s+(\d+)\s+years?', query, re.IGNORECASE)
        if last_years_match:
            num_years = int(last_years_match.group(1))
            if 1 <= num_years <= 20:
                result['year_start'] = str(self.current_year - num_years)
                result['year_end'] = str(self.current_year)
                result['matched_phrases'].append(last_years_match.group(0))
                return result
        
        return result
    
    def _extract_subject_filters(self, query: str, available_subjects: List[str] = None) -> Dict:
        """Extract subject filters from query"""
        result = {
            'subjects': [],
            'matched_phrases': []
        }
        
        query_lower = query.lower()
        matched_subjects = set()
        
        # Minimum word length to avoid matching single letters like "R"
        MIN_WORD_LENGTH = 3
        
        # Common words to exclude from matching (too generic)
        STOP_WORDS = {'the', 'and', 'for', 'are', 'was', 'were', 'been', 'have', 'has', 
                      'had', 'from', 'with', 'about', 'into', 'through', 'during',
                      'before', 'after', 'above', 'below', 'between', 'under', 'again',
                      'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
                      'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
                      'only', 'own', 'same', 'than', 'too', 'very', 'can', 'will', 'just',
                      'should', 'now', 'what', 'which', 'who', 'studies', 'study', 'research',
                      'published', 'thesis', 'theses', 'dissertation', 'dissertations', 'year'}
        
        # First, check against available subjects from database
        # Only match if the ENTIRE subject phrase appears in the query (not individual words)
        if available_subjects:
            for subject in available_subjects:
                subject_lower = subject.lower()
                
                # Skip subjects that are too short (like single letters "R")
                if len(subject_lower) < MIN_WORD_LENGTH:
                    continue
                
                # Only match if the full subject phrase is in the query
                # This prevents matching "R" or generic words
                if subject_lower in query_lower:
                    matched_subjects.add(subject)
                    result['matched_phrases'].append(subject)
        
        # Then, check against our predefined subject keywords
        for keyword, subject in self.keyword_to_subject.items():
            if keyword in query_lower:
                # Find the actual subject in available_subjects if possible
                if available_subjects:
                    for avail_subj in available_subjects:
                        if subject.lower() in avail_subj.lower() or avail_subj.lower() in subject.lower():
                            matched_subjects.add(avail_subj)
                            if keyword not in [p.lower() for p in result['matched_phrases']]:
                                result['matched_phrases'].append(keyword)
                            break
                else:
                    matched_subjects.add(subject.title())
                    if keyword not in [p.lower() for p in result['matched_phrases']]:
                        result['matched_phrases'].append(keyword)
        
        result['subjects'] = list(matched_subjects)
        return result
    
    def _clean_query(self, query: str, year_filters: Dict, subject_filters: Dict) -> str:
        """
        Clean the query by optionally removing filter phrases.
        
        Note: We keep the original query mostly intact since the semantic
        meaning might still be useful for search. We only remove explicit
        filter phrases that don't add semantic value.
        """
        cleaned = query
        
        # Remove year range phrases like "from 2020 to 2023"
        for phrase in year_filters.get('matched_phrases', []):
            # Only remove if it's a standalone filter phrase
            if any(p in phrase.lower() for p in ['from', 'between', 'in ', 'year ', 'published']):
                cleaned = re.sub(re.escape(phrase), '', cleaned, flags=re.IGNORECASE)
        
        # Clean up extra whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        # If cleaned query is too short, return original
        if len(cleaned.split()) < 2:
            return query
        
        return cleaned


# Singleton instance
query_parser = QueryParser()


def extract_filters_from_query(query: str, available_subjects: List[str] = None) -> Dict:
    """
    Convenience function to extract filters from a query.
    
    Args:
        query: The user's search query
        available_subjects: List of subjects available in the database
        
    Returns:
        Dictionary with extracted filters
    """
    return query_parser.parse_query(query, available_subjects)
