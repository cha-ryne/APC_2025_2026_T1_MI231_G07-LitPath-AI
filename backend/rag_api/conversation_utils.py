"""
Conversation utilities for LitPath AI RAG system.
Handles entity extraction, pronoun resolution, and conversation context management.
"""

import re
from typing import List, Dict, Set, Optional


class ConversationManager:
    """Manages conversation context for pronoun resolution and entity tracking"""
    
    def __init__(self):
        # Common stop words to filter out
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
            'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
            'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why',
            'about', 'into', 'through', 'during', 'before', 'after', 'above',
            'below', 'between', 'under', 'again', 'further', 'then', 'once'
        }
        
        # Pronouns that indicate reference to previous context
        self.pronouns = {
            'it', 'its', 'they', 'them', 'their', 'theirs',
            'this', 'that', 'these', 'those',
            'he', 'she', 'him', 'her', 'his', 'hers'
        }
        
        # Reference phrases that indicate follow-up
        self.reference_phrases = [
            'what about', 'how about', 'and what', 'tell me more',
            'more about', 'elaborate on', 'explain further',
            'compare', 'versus', 'vs', 'difference between',
            'same', 'similar', 'related'
        ]
    
    def extract_entities(self, text: str) -> List[str]:
        """
        Extract key entities from text (proper nouns, technical terms, codes, measurements)
        
        Args:
            text: Text to extract entities from
            
        Returns:
            List of extracted entities (max 10)
        """
        # Skip if text looks like an error message
        if 'error' in text.lower() or 'RESOURCE_EXHAUSTED' in text:
            return []
        
        entities = []
        
        # 1. Extract alphanumeric codes FIRST (most specific: PSB Rc82, IR29, STII-T-2021)
        # These are the most valuable entities for search
        codes = re.findall(r'\b[A-Z]{2,}[-\s]?[A-Za-z]*\d+\b', text)
        entities.extend(codes)
        
        # 2. Extract organization/institute names (PhilRice, IRRI, UPLB)
        # Only all-caps with 3+ letters (not sentence-starting words)
        orgs = re.findall(r'\b[A-Z]{3,}\b', text)  # Pure all-caps only
        # Also get CamelCase orgs like PhilRice
        camel_orgs = re.findall(r'\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b', text)
        entities.extend(orgs)
        entities.extend(camel_orgs)
        
        # 3. Extract measurements with units (very specific)
        measurements = re.findall(r'\d+\.?\d*\s*(?:tons?|kg|g|%|ha|hectares?|cm|m|mm|ppm|mM|dS)/?\w*', text, re.IGNORECASE)
        entities.extend(measurements)
        
        # 4. Extract quoted terms
        quoted = re.findall(r'"([^"]+)"', text)
        entities.extend(quoted)
        
        # Words to exclude (common non-entity words that appear capitalized)
        exclude_words = {
            # Common sentence starters
            'the', 'these', 'those', 'this', 'that', 'what', 'which', 'who',
            'how', 'when', 'where', 'why', 'also', 'however', 'therefore',
            'thus', 'hence', 'moreover', 'furthermore', 'additionally',
            # Research terms that aren't specific entities
            'source', 'sources', 'answer', 'question', 'study', 'studies',
            'research', 'result', 'results', 'finding', 'findings', 'conclusion',
            'based', 'according', 'shown', 'found', 'demonstrated', 'evidence',
            # Common multi-word patterns to avoid
            'rice', 'corn', 'plant', 'plants', 'crop', 'crops', 'variety', 'varieties',
            'method', 'methods', 'analysis', 'data', 'table', 'figure',
            # Phrases that get extracted incorrectly
            'what rice', 'these rice', 'the study', 'the yield', 'according to',
            'rice varieties', 'these varieties'
        }
        
        # Clean up and deduplicate
        cleaned = []
        seen = set()
        for entity in entities:
            entity = entity.strip()
            entity_lower = entity.lower()
            
            # Skip stop words, excluded words, short entities, and duplicates
            if (entity_lower not in self.stop_words and 
                entity_lower not in exclude_words and
                len(entity) > 2 and 
                entity_lower not in seen):
                cleaned.append(entity)
                seen.add(entity_lower)
        
        return cleaned[:10]  # Return top 10 entities
    
    def has_pronoun_reference(self, query: str) -> bool:
        """
        Check if query contains pronouns or reference phrases that need resolution
        
        Args:
            query: User query to check
            
        Returns:
            True if query contains pronouns/references
        """
        query_lower = query.lower()
        words = set(query_lower.split())
        
        # Check for pronouns
        if words & self.pronouns:
            return True
        
        # Check for reference phrases
        for phrase in self.reference_phrases:
            if phrase in query_lower:
                return True
        
        return False
    
    def resolve_pronouns(self, current_query: str, conversation_history: List[Dict]) -> str:
        """
        Enhance query by resolving pronouns using conversation history.
        Appends relevant entities from previous turns to improve search.
        
        Args:
            current_query: Current user query
            conversation_history: List of previous conversation turns
            
        Returns:
            Enhanced query with entities appended (if pronouns detected)
        """
        if not conversation_history:
            return current_query
        
        # Check if query needs pronoun resolution
        if not self.has_pronoun_reference(current_query):
            return current_query
        
        # Extract entities from last 2 turns (both query and response)
        all_entities = []
        for turn in conversation_history[-2:]:
            query_text = turn.get('query', '')
            response_text = turn.get('overview', turn.get('response', ''))
            
            # Extract from query
            all_entities.extend(self.extract_entities(query_text))
            
            # Extract from response (first 1000 chars to avoid noise)
            all_entities.extend(self.extract_entities(response_text[:1000]))
        
        # Deduplicate while preserving order
        seen = set()
        unique_entities = []
        for entity in all_entities:
            entity_lower = entity.lower()
            if entity_lower not in seen and entity_lower not in current_query.lower():
                unique_entities.append(entity)
                seen.add(entity_lower)
        
        # Take top 5 entities to append
        entities_to_add = unique_entities[:5]
        
        if entities_to_add:
            entity_context = " ".join(entities_to_add)
            enhanced_query = f"{current_query} {entity_context}"
            print(f"[CONVERSATION] Pronoun detected in query")
            print(f"[CONVERSATION] Original: '{current_query}'")
            print(f"[CONVERSATION] Enhanced: '{enhanced_query}'")
            return enhanced_query
        
        return current_query
    
    def get_conversation_context(self, history: List[Dict], max_turns: int = 3) -> str:
        """
        Build conversation context string from history for inclusion in prompts
        
        Args:
            history: Conversation history
            max_turns: Maximum number of turns to include
            
        Returns:
            Formatted conversation context string
        """
        if not history:
            return ""
        
        # Take last N turns
        recent_history = history[-max_turns:]
        
        context_parts = []
        for turn in recent_history:
            query = turn.get('query', '')
            response = turn.get('overview', turn.get('response', ''))
            
            # Truncate long responses to save tokens
            if len(response) > 500:
                response = response[:500] + "..."
            
            context_parts.append(f"User asked: {query}")
            context_parts.append(f"You answered: {response}")
        
        return "\n---\n".join([
            "\n".join(context_parts[i:i+2]) 
            for i in range(0, len(context_parts), 2)
        ])


# Singleton instance for use across the application
conversation_manager = ConversationManager()
