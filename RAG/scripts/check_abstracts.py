"""
Check all thesis txt files to see if abstract extraction stops at proper section headers
"""
import os
import sys
import re
from pathlib import Path

# Add RAG directory to path
sys.path.insert(0, os.path.dirname(__file__))
from extract_metadata import extract_thesis_metadata

def check_abstract_quality(text, filename):
    """Check if abstract contains section headers that shouldn't be there"""
    meta = extract_thesis_metadata(text)
    abstract = meta.get('abstract', '')
    
    if not abstract:
        return None, "No abstract found"
    
    # Check for problematic patterns in abstract
    problem_patterns = [
        (r'The Problem Domain', 'Contains "The Problem Domain"'),
        (r'CHAPTER\s+[IVXLCDM]+', 'Contains chapter heading'),
        (r'INTRODUCTION', 'Contains "INTRODUCTION"'),
        (r'METHODOLOGY', 'Contains "METHODOLOGY"'),
        (r'METHODS', 'Contains "METHODS"'),
        (r'RESULTS', 'Contains "RESULTS"'),
        (r'DISCUSSION', 'Contains "DISCUSSION"'),
        (r'CONCLUSION', 'Contains "CONCLUSION"'),
        (r'BACKGROUND', 'Contains "BACKGROUND"'),
        (r'LITERATURE REVIEW', 'Contains "LITERATURE REVIEW"'),
        (r'REVIEW OF', 'Contains "REVIEW OF"'),
        (r'STATEMENT OF THE PROBLEM', 'Contains "STATEMENT OF THE PROBLEM"'),
        (r'OBJECTIVES', 'Contains "OBJECTIVES"'),
        (r'^\s*[IVXLCDM]+\.\s+[A-Z]', 'Contains roman numeral section (I., II., etc.)'),
        (r'^\s*\d+\.\s+[A-Z]', 'Contains numbered section (1., 2., etc.)'),
    ]
    
    problems = []
    for pattern, description in problem_patterns:
        if re.search(pattern, abstract, re.IGNORECASE | re.MULTILINE):
            problems.append(description)
    
    # Check abstract length (abstracts shouldn't be too long)
    word_count = len(abstract.split())
    if word_count > 500:
        problems.append(f"Abstract is very long ({word_count} words)")
    
    return abstract, problems

def main():
    theses_dir = Path(__file__).parent / "theses"
    txt_files = sorted(theses_dir.glob("*.txt"))
    
    print(f"Checking {len(txt_files)} thesis files...\n")
    print("=" * 80)
    
    issues_found = []
    clean_files = []
    
    for txt_file in txt_files:
        try:
            with open(txt_file, 'r', encoding='utf-8') as f:
                text = f.read()
            
            abstract, problems = check_abstract_quality(text, txt_file.name)
            
            if problems and isinstance(problems, list):
                issues_found.append((txt_file.name, problems, abstract))
            elif abstract:
                clean_files.append(txt_file.name)
            
        except Exception as e:
            print(f"❌ ERROR reading {txt_file.name}: {e}")
    
    # Report results
    print(f"\n📊 SUMMARY:")
    print(f"   Total files: {len(txt_files)}")
    print(f"   ✅ Clean abstracts: {len(clean_files)}")
    print(f"   ⚠️  Issues found: {len(issues_found)}")
    print("=" * 80)
    
    if issues_found:
        print(f"\n⚠️  FILES WITH ABSTRACT ISSUES:\n")
        for filename, problems, abstract in issues_found:
            print(f"📄 {filename}")
            for problem in problems:
                print(f"   - {problem}")
            
            # Show first 200 chars of abstract
            abstract_preview = abstract[:200].replace('\n', ' ')
            print(f"   Preview: {abstract_preview}...")
            print()
    else:
        print("\n✅ All abstracts look good!")
    
    # Show some clean examples
    if clean_files:
        print(f"\n✅ SAMPLE CLEAN FILES (first 5):")
        for filename in clean_files[:5]:
            print(f"   - {filename}")

if __name__ == "__main__":
    main()
