"""
Test strict filtering to verify:
1. Year range is correctly applied (last 3 years: 2022-2024)
2. Subject matching is exact (Agriculture only, not "Agriculture 4.0" or "Education")
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api"

def test_strict_agriculture_last_3_years():
    """Test filtering for Agriculture in the last 3 years"""
    print("=" * 80)
    print("Testing: Agriculture + Last 3 Years (2022-2024)")
    print("=" * 80)
    
    current_year = 2024  # Based on the available data
    year_start = current_year - 2  # 2022
    year_end = current_year  # 2024
    
    payload = {
        "question": "agricultural research",
        "filters": {
            "subjects": ["Agriculture"],
            "year_start": year_start,
            "year_end": year_end
        }
    }
    
    print(f"\nRequest:")
    print(json.dumps(payload, indent=2))
    
    response = requests.post(f"{BASE_URL}/search/", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Status: Success")
        print(f"Filters Applied: {data.get('filters_applied')}")
        print(f"Documents Found: {len(data.get('documents', []))}")
        
        # Validate results
        print("\n" + "=" * 80)
        print("VALIDATION RESULTS:")
        print("=" * 80)
        
        issues_found = []
        
        for i, doc in enumerate(data.get('documents', []), 1):
            year = doc.get('publication_year', '')
            subjects = doc.get('subjects', '')
            
            # Check year range
            try:
                year_int = int(year)
                if year_int < year_start or year_int > year_end:
                    issues_found.append(f"❌ Doc {i}: Year {year} is outside range {year_start}-{year_end}")
            except (ValueError, TypeError):
                issues_found.append(f"❌ Doc {i}: Invalid year '{year}'")
            
            # Check if Agriculture is in subjects (as exact match)
            subject_list = [s.strip() for s in subjects.split(",")]
            if "Agriculture" not in subject_list:
                issues_found.append(f"❌ Doc {i}: 'Agriculture' not found as exact subject in '{subjects}'")
            
            # Display document info
            print(f"\n{i}. {doc['title'][:80]}")
            print(f"   Year: {year} {'✅' if year_start <= int(year) <= year_end else '❌'}")
            print(f"   Subjects: {subjects}")
            print(f"   Has 'Agriculture': {'✅' if 'Agriculture' in subject_list else '❌'}")
        
        # Summary
        print("\n" + "=" * 80)
        if issues_found:
            print(f"⚠️  FOUND {len(issues_found)} ISSUES:")
            for issue in issues_found:
                print(f"  {issue}")
        else:
            print("✅ ALL DOCUMENTS PASS VALIDATION!")
        print("=" * 80)
        
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)


def test_subject_exact_match():
    """Test that 'Agriculture' doesn't match 'Agriculture 4.0' or 'Education'"""
    print("\n\n" + "=" * 80)
    print("Testing: Exact Subject Matching")
    print("=" * 80)
    
    payload = {
        "question": "farming techniques",
        "filters": {
            "subjects": ["Agriculture"]
        }
    }
    
    print(f"\nRequest:")
    print(json.dumps(payload, indent=2))
    
    response = requests.post(f"{BASE_URL}/search/", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Status: Success")
        print(f"Documents Found: {len(data.get('documents', []))}")
        
        print("\n" + "=" * 80)
        print("SUBJECT MATCHING VALIDATION:")
        print("=" * 80)
        
        exact_matches = 0
        wrong_matches = []
        
        for i, doc in enumerate(data.get('documents', []), 1):
            subjects = doc.get('subjects', '')
            subject_list = [s.strip() for s in subjects.split(",")]
            
            print(f"\n{i}. Subjects: {subjects}")
            
            if "Agriculture" in subject_list:
                print(f"   ✅ Exact match found")
                exact_matches += 1
            else:
                print(f"   ❌ No exact 'Agriculture' match")
                wrong_matches.append(f"Doc {i}: {subjects}")
        
        print("\n" + "=" * 80)
        print(f"Exact 'Agriculture' matches: {exact_matches}/{len(data.get('documents', []))}")
        
        if wrong_matches:
            print(f"\n⚠️  WRONG MATCHES FOUND:")
            for wrong in wrong_matches:
                print(f"  {wrong}")
        else:
            print("✅ ALL DOCUMENTS HAVE EXACT 'Agriculture' MATCH!")
        print("=" * 80)
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)


def test_year_2018_should_not_appear():
    """Test that filtering for 2022-2024 does not return 2018 documents"""
    print("\n\n" + "=" * 80)
    print("Testing: Year 2018 should NOT appear in 2022-2024 range")
    print("=" * 80)
    
    payload = {
        "question": "research studies",
        "filters": {
            "year_start": 2022,
            "year_end": 2024
        }
    }
    
    print(f"\nRequest:")
    print(json.dumps(payload, indent=2))
    
    response = requests.post(f"{BASE_URL}/search/", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Status: Success")
        print(f"Documents Found: {len(data.get('documents', []))}")
        
        print("\n" + "=" * 80)
        print("YEAR RANGE VALIDATION:")
        print("=" * 80)
        
        old_docs = []
        
        for i, doc in enumerate(data.get('documents', []), 1):
            year = doc.get('publication_year', '')
            
            try:
                year_int = int(year)
                if year_int < 2022:
                    old_docs.append(f"Doc {i}: Year {year} (Title: {doc['title'][:50]})")
                    print(f"\n{i}. ❌ INVALID YEAR: {year}")
                else:
                    print(f"\n{i}. ✅ Valid Year: {year}")
                
                print(f"   {doc['title'][:60]}")
            except (ValueError, TypeError):
                print(f"\n{i}. ⚠️  Invalid year format: {year}")
        
        print("\n" + "=" * 80)
        if old_docs:
            print(f"❌ FOUND {len(old_docs)} DOCUMENTS OUTSIDE RANGE:")
            for doc in old_docs:
                print(f"  {doc}")
        else:
            print("✅ ALL DOCUMENTS ARE WITHIN 2022-2024 RANGE!")
        print("=" * 80)
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("STRICT FILTER VALIDATION TESTS")
    print("=" * 80 + "\n")
    
    try:
        # Test 1: Agriculture + Last 3 years
        test_strict_agriculture_last_3_years()
        
        # Test 2: Exact subject matching
        test_subject_exact_match()
        
        # Test 3: Old years should not appear
        test_year_2018_should_not_appear()
        
        print("\n" + "=" * 80)
        print("ALL VALIDATION TESTS COMPLETED!")
        print("=" * 80)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to the API server.")
        print("Make sure the Django server is running at http://localhost:8000")
