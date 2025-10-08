# Controlled vocabulary for main subjects
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
    import re
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity

    meta = {}
    lines = text.splitlines()

    # Title: first non-empty line
    for l in lines:
        if l.strip():
            meta["title"] = l.strip()
            break

    # Author: look for a line with all uppercase or title case, not matching section headers
    for l in lines[1:10]:
        if l.strip() and not re.match(r'^(chapter|introduction|background|review|statement|objectives|scope|significance|summary|conclusion|references|acknowledgments?)', l, re.I):
            meta["author"] = l.strip()
            break

    # Degree: look for 'Master', 'Doctor', etc.
    for l in lines:
        if re.search(r'(Master|Doctor|Bachelor|Philosophy|Science|Arts|Engineering)', l, re.I):
            meta["degree"] = l.strip()
            break

    # University: look for 'University'
    for l in lines:
        if 'university' in l.lower():
            meta["university"] = l.strip()
            break

    # Publication year: look for a line with a 4-digit year (e.g., 2018)
    for l in lines[1:20]:
        m = re.search(r'(19|20)\d{2}', l)
        if m:
            meta["publication_year"] = m.group(0)
            break

    # Abstract: text between 'ABSTRACT' and the next major section header
    abstract = []
    in_abstract = False
    for l in lines:
        if not in_abstract and l.upper().startswith("ABSTRACT"):
            in_abstract = True
            continue
        if in_abstract:
            # Stop at major section headers or numbered section headers with a word (e.g., '1. Introduction', '2. Theoretical Background')
            if re.match(r'^(CHAPTER|INTRODUCTION|BACKGROUND|REVIEW|STATEMENT|OBJECTIVES|SCOPE|SIGNIFICANCE|SUMMARY|CONCLUSION|REFERENCES|ACKNOWLEDGMENTS?)', l, re.I):
                break
            if re.match(r'^\d+\.\s+\w+', l):
                break
            if l.strip().lower().startswith("keywords:") or l.strip().upper().startswith("PACS:"):
                break
            abstract.append(l)
    meta["abstract"] = " ".join(abstract).strip()

    # Subjects/keywords: look for a line starting with 'Keywords:' or 'PACS:' (multi-line)
    keywords = []
    i = 0
    while i < len(lines):
        l = lines[i]
        if l.lower().startswith("keywords:") or l.strip().upper().startswith("PACS:"):
            key_lines = [l]
            i += 1
            while i < len(lines):
                next_line = lines[i]
                if not next_line or re.match(r'^(CHAPTER|INTRODUCTION|BACKGROUND|REVIEW|STATEMENT|OBJECTIVES|SCOPE|SIGNIFICANCE|SUMMARY|CONCLUSION|REFERENCES|ACKNOWLEDGMENTS?)', next_line, re.I):
                    break
                key_lines.append(next_line)
                i += 1
            key_text = ' '.join(key_lines)
            if key_text.lower().startswith("keywords:"):
                key_text = key_text[len("keywords:"):]
            keywords = [k.strip() for k in key_text.split(",") if k.strip()]
            break
        i += 1
    meta["subjects"] = keywords

    return meta