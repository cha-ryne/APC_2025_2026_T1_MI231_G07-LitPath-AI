"""
Automatically fix abstract extraction issues in all thesis txt files
by improving section header detection
"""
import os
import sys
import re
from pathlib import Path

def fix_abstract_in_text(text):
    """
    Fix abstract by ensuring it stops at proper section headers
    Returns the fixed text
    """
    lines = text.splitlines()
    
    # Find abstract section
    abstract_start = -1
    abstract_end = -1
    
    for i, line in enumerate(lines):
        # Find where abstract starts
        if abstract_start == -1 and line.upper().strip() == "ABSTRACT":
            abstract_start = i
            continue
        
        # If we're in abstract section, find where it should end
        if abstract_start != -1 and abstract_end == -1:
            # Comprehensive list of section headers that mark end of abstract
            section_patterns = [
                r'^(CHAPTER|INTRODUCTION|BACKGROUND|REVIEW|STATEMENT|OBJECTIVES|SCOPE|SIGNIFICANCE|SUMMARY|CONCLUSION|REFERENCES|ACKNOWLEDGMENTS?|THE PROBLEM|PROBLEM DOMAIN|METHODOLOGY|METHODS|RESULTS|DISCUSSION|LITERATURE REVIEW)(\s|$)',
                r'^([IVXLCDM]+|\d+)\.\s+',  # Roman/Arabic numerals with period
                r'^KEYWORDS?:',
                r'^PACS:',
            ]
            
            for pattern in section_patterns:
                if re.match(pattern, line.strip(), re.IGNORECASE):
                    abstract_end = i
                    break
    
    # If we found abstract bounds, reconstruct the text
    if abstract_start != -1:
        if abstract_end == -1:
            # Abstract goes to end of file (unlikely but handle it)
            abstract_end = len(lines)
        
        # Extract abstract lines (excluding the "Abstract" header itself)
        abstract_lines = lines[abstract_start + 1:abstract_end]
        
        # Clean up abstract: join into single paragraph, remove excess whitespace
        abstract_text = ' '.join(line.strip() for line in abstract_lines if line.strip())
        
        # Rebuild the file
        new_lines = lines[:abstract_start + 1]  # Everything up to and including "Abstract"
        new_lines.append(abstract_text)  # The cleaned abstract as one paragraph
        new_lines.append('')  # Blank line after abstract
        new_lines.extend(lines[abstract_end:])  # Rest of the document
        
        return '\n'.join(new_lines)
    
    # If no abstract found, return original
    return text

def main():
    theses_dir = Path(__file__).parent / "theses"
    txt_files = sorted(theses_dir.glob("*.txt"))
    
    print(f"Processing {len(txt_files)} thesis files...\n")
    
    fixed_count = 0
    error_count = 0
    
    for txt_file in txt_files:
        try:
            # Read original
            with open(txt_file, 'r', encoding='utf-8') as f:
                original_text = f.read()
            
            # Fix abstract
            fixed_text = fix_abstract_in_text(original_text)
            
            # Only write if changed
            if fixed_text != original_text:
                with open(txt_file, 'w', encoding='utf-8') as f:
                    f.write(fixed_text)
                print(f"✅ Fixed: {txt_file.name}")
                fixed_count += 1
            
        except Exception as e:
            print(f"❌ ERROR processing {txt_file.name}: {e}")
            error_count += 1
    
    print(f"\n{'='*80}")
    print(f"📊 SUMMARY:")
    print(f"   Total files: {len(txt_files)}")
    print(f"   ✅ Fixed: {fixed_count}")
    print(f"   ❌ Errors: {error_count}")
    print(f"   ⏭️  Unchanged: {len(txt_files) - fixed_count - error_count}")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()
