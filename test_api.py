"""
Simple API Test Script
Tests the Django backend endpoints
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def print_section(title):
    print("\n" + "="*50)
    print(f"  {title}")
    print("="*50)

def test_health():
    """Test health endpoint"""
    print_section("Test 1: Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health/", timeout=5)
        print(f"✓ Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Response received")
            print(f"  - Status: {data.get('status')}")
            print(f"  - Documents: {data.get('total_documents')}")
            print(f"  - Chunks: {data.get('total_chunks')}")
            print(f"  - TXT files: {data.get('total_txt_files')}")
            return True
        else:
            print(f"✗ Unexpected status code: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to backend!")
        print("  Make sure the server is running:")
        print("  python backend/manage.py runserver")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_search():
    """Test search endpoint"""
    print_section("Test 2: Search")
    
    question = "What is agriculture?"
    print(f"Question: {question}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/search/",
            json={"question": question},
            timeout=30
        )
        
        print(f"✓ Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Response received")
            
            overview = data.get('overview', '')
            documents = data.get('documents', [])
            
            print(f"\nOverview (first 200 chars):")
            print(f"  {overview[:200]}...")
            
            print(f"\nDocuments found: {len(documents)}")
            if documents:
                print(f"\nFirst document:")
                doc = documents[0]
                print(f"  - Title: {doc.get('title')}")
                print(f"  - Author: {doc.get('author')}")
                print(f"  - Year: {doc.get('publication_year')}")
                print(f"  - File: {doc.get('file')}")
            
            return True
        else:
            print(f"✗ Unexpected status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("✗ Request timed out (search takes time for first request)")
        print("  This is normal for the first search. Try again.")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_search_no_question():
    """Test search without question (should fail)"""
    print_section("Test 3: Search Without Question")
    
    try:
        response = requests.post(
            f"{BASE_URL}/search/",
            json={},
            timeout=5
        )
        
        print(f"✓ Status Code: {response.status_code}")
        
        if response.status_code == 400:
            print("✓ Correctly rejected empty question")
            return True
        else:
            print(f"✗ Expected 400, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def main():
    print("\n" + "="*50)
    print("  LitPath AI Backend API Test")
    print("="*50)
    print("\nTesting backend at:", BASE_URL)
    
    results = []
    
    # Run tests
    results.append(("Health Check", test_health()))
    
    if results[0][1]:  # Only test search if health check passes
        results.append(("Search", test_search()))
        results.append(("Invalid Request", test_search_no_question()))
    
    # Summary
    print_section("Test Summary")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
