
import dotenv
dotenv.load_dotenv()

def recover_chromadb_from_index(pdf_folder, chunk_size=500):
    """
    If ChromaDB is empty but indexed_files.json exists, re-embed and re-index all PDFs listed in indexed_files.json.
    """
    indexed_path = os.path.join(pdf_folder, "indexed_files.json")
    if not os.path.exists(indexed_path):
        print("[RECOVERY] No indexed_files.json found. Skipping ChromaDB recovery.")
        return 0
    with open(indexed_path, "r", encoding="utf-8") as f:
        indexed_files = json.load(f)
    if not indexed_files:
        print("[RECOVERY] indexed_files.json is empty. Skipping ChromaDB recovery.")
        return 0
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
    from extract_metadata import extract_thesis_metadata
    recovered_chunks = 0
    for txt_path in indexed_files:
        if not os.path.exists(txt_path):
            print(f"[RECOVERY] Missing .txt for {txt_path}, skipping.")
            continue
        if in_abstract:
            # Stop at major section headers, roman/numbered section headers with or without section names
            if re.match(r'^(CHAPTER|INTRODUCTION|BACKGROUND|REVIEW|STATEMENT|OBJECTIVES|SCOPE|SIGNIFICANCE|SUMMARY|CONCLUSION|REFERENCES|ACKNOWLEDGMENTS?)', l, re.I):
                break
            # Match lines like 'I. INTRODUCTION', 'II. METHODS', '1. INTRODUCTION', etc.
            if re.match(r'^([IVXLCDM]+|\d+)\.\s*([A-Z][A-Z ]+)?$', l.strip()):
                break
            if l.strip().lower().startswith("keywords:") or l.strip().upper().startswith("PACS:"):
                break
            line = l.strip()
            abstract.append(line)
        idx += 1
    meta["abstract"] = " ".join(abstract).strip()

    # Subjects/keywords: look for a line starting with 'Keywords:' or 'PACS:' (multi-line)
    keywords = []
    for i, l in enumerate(lines):
        if l.lower().startswith("keywords:") or l.strip().upper().startswith("PACS:"):
            # Remove the 'Keywords:' or 'PACS:' prefix and split by comma/semicolon
            key_line = l.split(':', 1)[-1] if ':' in l else l
            key_line = key_line.replace('Keywords', '').replace('PACS', '').replace(':', '').strip()
            if key_line:
                keywords += [k.strip() for k in re.split(r'[;,]', key_line) if k.strip()]
            # Also check following lines until a section header or blank line
            for j in range(i+1, len(lines)):
                next_l = lines[j].strip()
                if not next_l or re.match(r'^(CHAPTER|INTRODUCTION|BACKGROUND|REVIEW|STATEMENT|OBJECTIVES|SCOPE|SIGNIFICANCE|SUMMARY|CONCLUSION|REFERENCES|ACKNOWLEDGMENTS?)', next_l, re.I) or re.match(r'^[IVXLCDM]+\.[ \t]', next_l, re.I) or re.match(r'^\d+\.[ \t]', next_l):
                    break
                keywords += [k.strip() for k in re.split(r'[;,]', next_l) if k.strip()]
            break

    # Guarantee at least one subject, and main subject is first
    def get_main_subject(subjects, title, degree, abstract):
        # 1. Rule-based mapping from degree/title
        for k, v in DEGREE_TO_MAIN_SUBJECT.items():
            if k in (degree or '').lower() or k in (title or '').lower():
                return v
        # 2. If any subject matches a main subject, use it
        for s in subjects:
            for main in MAIN_SUBJECTS:
                if s.lower() == main.lower():
                    return main
        # 3. Fallback: use embedding similarity if available
        try:
            from sentence_transformers import SentenceTransformer
            from sklearn.metrics.pairwise import cosine_similarity
            model = SentenceTransformer('all-MiniLM-L6-v2')
            main_embs = model.encode(MAIN_SUBJECTS)
            context = ((degree or "") + ". " + (title or "")).strip()
            if context:
                context_emb = model.encode([context])[0]
                sims = cosine_similarity([context_emb], main_embs)[0]
                best_idx = int(sims.argmax())
                return MAIN_SUBJECTS[best_idx]
            if abstract:
                context_emb = model.encode([abstract])[0]
                sims = cosine_similarity([context_emb], main_embs)[0]
                best_idx = int(sims.argmax())
                return MAIN_SUBJECTS[best_idx]
        except Exception:
            pass
        # 4. Fallback: use 'General Works' if present, else first main subject
        for main in MAIN_SUBJECTS:
            if main == "General Works":
                return main
        return MAIN_SUBJECTS[0]

    subjects = [s for s in keywords if s]
    title = meta.get("title", "")
    degree = meta.get("degree", "")
    abstract = meta.get("abstract", "")
    main_subject = get_main_subject(subjects, title, degree, abstract)
    # Remove any duplicate of main subject in subjects
    subjects = [s for s in subjects if main_subject.lower() != s.lower()]
    meta["main_subject"] = main_subject
    meta["subjects"] = [main_subject] + subjects if subjects else [main_subject]

    return meta