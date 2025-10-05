import re
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

MAIN_SUBJECTS = [
    "AGRICULTURE",
    "ANTHROPOLOGY",
    "ARCHAEOLOGY",
    "ARCHITECTURE",
    "ASTRONOMY",
    "BIOLOGY",
    "BOTANY",
    "CHEMISTRY",
    "COMMUNICATIONS",
    "COMPUTER SCIENCE",
    "ECOLOGY",
    "EDUCATION",
    "ENGINEERING",
    "INFORMATION AND COMMUNICATIONS TECHNOLOGY",
    "ENVIRONMENTAL SCIENCE",
    "FISHERIES",
    "FOOD SCIENCE AND TECHNOLOGY",
    "FORESTRY",
    "GENETICS",
    "GEOLOGY",
    "HEALTH AND WELLNESS",
    "HYDROLOGY",
    "INDUSTRY",
    "LIBRARY AND INFORMATION SCIENCE",
    "LIVELIHOOD",
    "MARINE SCIENCE",
    "MATHEMATICS",
    "MEDICINE",
    "METEOROLOGY",
    "NUTRITION",
    "PHYSICS",
    "SCIENCE AND TECHNOLOGY",
    "STATISTICS",
    "SOCIAL SCIENCES",
    "VETERINARY MEDICINE",
    "ZOOLOGY",
    "GENERAL WORKS"
]

def extract_thesis_metadata(text):
    meta = {"title": "", "author": "", "degree": "", "university": "", "call_no": None, "discipline": "", "abstract": "", "publication_year": "", "subjects": []}
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    front_matter = lines[:60]  # Use first 60 lines as 'front matter' for heuristics

    # Title: look for first quoted line after 'entitled', else line after 'entitled', else fallback
    title_found = False
    for i, line in enumerate(front_matter):
        if re.search(r'entitled', line, re.I):
            # Look for quoted line in next 5 lines
            for j in range(i+1, min(i+6, len(front_matter))):
                m = re.search(r'"([^"]+)"|\'([^\']+)\'|“([^”]+)”', front_matter[j])
                if m:
                    meta["title"] = m.group(1) or m.group(2) or m.group(3)
                    title_found = True
                    break
                if front_matter[j].strip() and not front_matter[j].strip().lower().startswith('prepared'):
                    meta["title"] = front_matter[j].strip('"\'“”')
                    title_found = True
                    break
        if title_found:
            break
    if not title_found:
        # Fallback: first line with >5 words and not all caps
        for line in front_matter:
            if len(line.split()) > 5 and not line.isupper():
                meta["title"] = line.strip('"\'“”')
                title_found = True
                break
    if not title_found and front_matter:
        meta["title"] = front_matter[0]
    # Remove leading quote or apostrophe (ASCII and Unicode) from title
    meta["title"] = meta["title"].lstrip('"\'“”‘’')

    # Degree: look for full degree name (e.g., 'Master of Science in ...')
    for line in front_matter:
        m = re.search(r'(Master|Bachelor|Doctor) of [A-Za-z ,()]+', line)
        if m:
            meta["degree"] = m.group(0).strip()
            break

    # Author: look for first non-empty line after 'by' or 'name of student', or first capitalized name in first 80 lines
    author_found = False
    for i, line in enumerate(front_matter):
        if line.lower().startswith('by'):
            # Get next non-empty line if 'by' is alone, else get after 'by '
            if line.strip().lower() == 'by':
                for j in range(i+1, min(i+5, len(front_matter))):
                    candidate = front_matter[j].strip()
                    if candidate:
                        meta["author"] = candidate
                        author_found = True
                        break
            else:
                meta["author"] = line[3:].strip()
                author_found = True
            if author_found:
                break
        if 'name of student' in line.lower():
            # Get next non-empty line
            for j in range(i+1, min(i+5, len(front_matter))):
                candidate = front_matter[j].strip()
                if candidate and len(candidate.split()) <= 5:
                    meta["author"] = candidate
                    author_found = True
                    break
            if author_found:
                break
    if not author_found:
        # Look for first capitalized name in first 80 lines
        for line in lines[:80]:
            if re.match(r'^[A-Z][a-z]+( [A-Z][a-z]+)+$', line):
                meta["author"] = line.strip()
                break

    # Publication year: look for 'June YYYY', 'defended on ... YYYY', or last 4-digit number in front matter
    for line in front_matter:
        m = re.search(r'(June|May|April|March|February|January|July|August|September|October|November|December)\s+(19\d{2}|20\d{2})', line)
        if m:
            meta["publication_year"] = m.group(2)
            break
        m2 = re.search(r'defended on [A-Za-z]+ \d{1,2}, (19\d{2}|20\d{2})', line, re.I)
        if m2:
            meta["publication_year"] = m2.group(1)
            break
    if not meta["publication_year"]:
        for line in reversed(front_matter):
            year_match = re.search(r'(19\d{2}|20\d{2})', line)
            if year_match:
                meta["publication_year"] = year_match.group(1)
                break
    # University: look for 'University of ...' in front matter
    for line in front_matter:
        m = re.search(r'University of the [A-Za-z ]+', line)
        if m:
            meta["university"] = m.group(0).strip()
            break

    # Call No: look for 'Call No' line, else None
    meta["call_no"] = None
    for line in lines:
        if line.lower().startswith("call no"):
            meta["call_no"] = line.split(":",1)[-1].strip() or None
            break

    # Abstract: find 'ABSTRACT' header, collect lines until next all-caps heading or keywords/subject
    abstract = ""
    abstract_found = False
    for i, line in enumerate(lines):
        if line.strip().upper() == "ABSTRACT":
            abstract_found = True
            continue
        if abstract_found:
            if (line.isupper() and len(line.split()) < 8 and not line.strip().startswith("KEYWORDS")) or line.lower().startswith("keywords") or line.lower().startswith("subject"):
                break
            abstract += (" " if abstract else "") + line.strip()
    # Change last comma in abstract to period
    abs_clean = abstract.strip()
    if abs_clean.endswith(","):
        abs_clean = abs_clean[:-1] + "."
    else:
        # Replace last comma with period if present
        last_comma = abs_clean.rfind(",")
        if last_comma != -1:
            abs_clean = abs_clean[:last_comma] + "." + abs_clean[last_comma+1:]
    meta["abstract"] = abs_clean

    # Keywords/Subjects: find 'keywords:' or 'subject(s):' anywhere, split by comma or line, remove page numbers
    keywords = []
    for i, line in enumerate(lines):
        if line.lower().startswith("keywords") or line.lower().startswith("subject"):
            # Remove label
            kw_text = line.split(":",1)[-1] if ":" in line else line
            # Add following lines if not uppercase (not a heading)
            j = i+1
            while j < len(lines) and not lines[j].isupper():
                kw_text += ", " + lines[j]
                j += 1
            # Split by comma or line
            for kw in re.split(r'[\n,]', kw_text):
                kw_clean = kw.strip()
                # Remove roman numerals (page numbers like xii, ix, etc.)
                if kw_clean and not re.match(r'^[ivxlcIVXLC]+$', kw_clean):
                    keywords.append(kw_clean)
            break

    # Main subject assignment from controlled list (allow partial/substring matches)
    assigned_main = None
    for kw in keywords:
        kw_lc = kw.lower()
        for subj in MAIN_SUBJECTS:
            subj_lc = subj.lower()
            # Assign if main subject is a substring of keyword or vice versa (partial match)
            if subj_lc in kw_lc or kw_lc in subj_lc:
                assigned_main = subj
                break
        if assigned_main:
            break
    if assigned_main:
        meta["subjects"] = [assigned_main] + [k for k in keywords if assigned_main.lower() not in k.lower()]
    else:
        meta["subjects"] = keywords

    # Main subject assignment using semantic similarity
    model = SentenceTransformer('all-MiniLM-L6-v2')
    subject_embeddings = model.encode(MAIN_SUBJECTS)
    assigned_main = None
    max_sim = 0.0
    for kw in keywords:
        kw_emb = model.encode([kw])[0]
        sims = cosine_similarity([kw_emb], subject_embeddings)[0]
        best_idx = sims.argmax()
        if sims[best_idx] > max_sim and sims[best_idx] > 0.5:  # threshold for semantic match
            assigned_main = MAIN_SUBJECTS[best_idx]
            max_sim = sims[best_idx]
    if assigned_main:
        meta["subjects"] = [assigned_main] + [k for k in keywords if assigned_main.lower() not in k.lower()]
    else:
        meta["subjects"] = keywords

    return meta

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python extract_metadata.py <textfile>")
        sys.exit(1)
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        text = f.read()
    meta = extract_thesis_metadata(text)
    import json
    print(json.dumps(meta, indent=2, ensure_ascii=False))
