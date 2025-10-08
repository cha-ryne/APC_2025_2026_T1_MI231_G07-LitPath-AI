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

    # New format: fixed lines for metadata
    meta = {"title": "", "author": "", "degree": "", "university": "", "call_no": None, "discipline": "", "abstract": "", "publication_year": "", "subjects": []}
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    # Extract by fixed line numbers (1-based)
    meta["title"] = lines[0] if len(lines) > 0 else ""
    meta["author"] = lines[2] if len(lines) > 2 else ""
    meta["university"] = lines[4] if len(lines) > 4 else ""
    meta["degree"] = lines[6] if len(lines) > 6 else ""
    meta["publication_year"] = lines[8] if len(lines) > 8 else ""
    # Abstract: from line 10 (index 10) until next header (e.g., 'CHAPTER', 'INTRODUCTION', etc.)
    abstract_lines = []
    header_pattern = re.compile(r'^(chapter|introduction|background|review|statement|objectives|scope|significance|summary|conclusion|references|acknowledgments?)', re.I)
    for l in lines[10:]:
        if header_pattern.match(l.strip().lower()):
            break
        abstract_lines.append(l)
    meta["abstract"] = " ".join(abstract_lines).strip()
    # Subjects/keywords: if not present, generate from abstract (simple heuristic: top 3 significant words)
    if not meta["subjects"] or len(meta["subjects"]) == 0:
        # Basic keyword extraction: take top 3 most frequent non-stopword words from abstract
        import collections
        stopwords = set([
            'the','and','of','in','to','a','for','is','on','with','as','by','an','at','from','that','this','be','are','was','it','or','which','has','have','but','not','were','their','can','its','also','these','such','may','had','been','will','more','than','other','into','between','using','used','study','studies','results','showed','found','based','among','after','during','all','one','two','three','four','five','six','seven','eight','nine','ten','each','per','within','over','under','both','most','some','first','second','third','new','our','we','they','he','she','his','her','them','who','what','when','where','why','how','do','does','did','so','if','no','yes','because','due','up','out','about','very','there','those','like','just','get','got','make','made','many','much','even','still','should','could','would','being','through','such','then','now','see','seen','known','well','however','therefore','thus','i','you','your','us','me','my','mine','own','etc'
        ])
        words = re.findall(r'\b\w+\b', meta["abstract"].lower())
        words = [w for w in words if w not in stopwords and len(w) > 2]
        freq = collections.Counter(words)
        top_keywords = [w for w, _ in freq.most_common(3)]
        meta["subjects"] = top_keywords
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
