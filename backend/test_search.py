"""
Quick test script for the RAG search API
Run this while the server is running in another terminal
"""
import requests
import json

API_URL = "http://127.0.0.1:8000/api/search/"

def test_search(question, max_results=5):
    """Test the search API"""
    payload = {
        "question": question,
        "max_results": max_results
    }
    
    try:
        response = requests.post(API_URL, json=payload)
        data = response.json()
        
        print(f"\n{'='*60}")
        print(f"Query: {question}")
        print(f"{'='*60}")
        
        if 'error' in data:
            print(f"Error: {data['error']}")
            return
        
        # Print overview
        print(f"\n--- OVERVIEW ---")
        overview = data.get('overview', 'No overview') or 'No overview'
        print(overview[:500] if len(overview) > 500 else overview)
        
        # Print documents
        docs = data.get('documents', []) or []
        print(f"\n--- DOCUMENTS ({len(docs)} found) ---")
        for i, doc in enumerate(docs):
            print(f"\n[{i+1}] {doc.get('title', 'No title')}")
            print(f"    Author: {doc.get('author', 'Unknown')}")
            print(f"    Year: {doc.get('publication_year', 'Unknown')}")
            print(f"    Subjects: {doc.get('subjects', [])}")
        
        # Print suggestions if any
        suggestions = data.get('suggestions', []) or []
        if suggestions:
            print(f"\n--- SUGGESTIONS ---")
            for s in suggestions:
                print(f"  • {s}")
        
        # Print accuracy metrics
        metrics = data.get('accuracy_metrics', {}) or {}
        if metrics:
            search = metrics.get('search', {}) or {}
            print(f"\n--- METRICS ---")
            print(f"  Documents returned: {search.get('documents_returned', 0)}")
            print(f"  Avg distance: {search.get('avg_distance', 'N/A')}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to server. Is it running?")
    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == "__main__":
    # Test queries
    queries = [
        "How does plastic pollution affect plant growth in farmland?",
        "What are the effects of climate change on agriculture?",
        "Find research about machine learning in healthcare",
        "How to improve rice yield in the Philippines?",
    ]
    
    for q in queries:
        test_search(q)
        print("\n")
