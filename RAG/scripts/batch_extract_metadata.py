import os
import json
import sys
from pathlib import Path

# --- Optional: Django integration (safe import) ---
DJANGO_AVAILABLE = False
try:
    # Add backend to path and setup Django
    backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
    if os.path.exists(backend_path):
        sys.path.append(backend_path)
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'litpath_backend.settings')
        import django
        django.setup()
        from rag_api.models import Material
        DJANGO_AVAILABLE = True
        print("✅ Django integration enabled – database will be updated.")
    else:
        print("⚠️ Backend folder not found – running in JSON‑only mode.")
except Exception as e:
    print(f"⚠️ Django not available – running in JSON‑only mode. ({e})")

# --- Your existing metadata extractor ---
from extract_metadata import extract_thesis_metadata

def main():
    # Correct path to theses folder (relative to this script)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    theses_dir = os.path.join(script_dir, "theses")
    out_path = os.path.join(theses_dir, "all_metadata.json")

    if not os.path.exists(theses_dir):
        print(f"❌ Theses folder not found: {theses_dir}")
        return

    txt_files = [f for f in os.listdir(theses_dir) if f.endswith(".txt")]
    print(f"📄 Found {len(txt_files)} thesis files.")

    all_metadata = {}
    created_count = 0
    updated_count = 0

    for filename in txt_files:
        fpath = os.path.join(theses_dir, filename)
        with open(fpath, "r", encoding="utf-8") as f:
            text = f.read()

        if not text.strip():
            print(f"⚠️ Skipping {filename}: file is empty.")
            continue

        # Extract metadata (your existing function)
        meta = extract_thesis_metadata(text)
        if not meta or not isinstance(meta, dict):
            print(f"⚠️ Skipping {filename}: could not extract any metadata.")
            continue

        # --- Store in JSON (original workflow) ---
        meta["file"] = filename
        all_metadata[filename] = meta

        # --- Update Django database (only if available) ---
        if DJANGO_AVAILABLE:
            # Prepare fields
            title = meta.get('title', '').strip()
            author = meta.get('author', '').strip()
            year = meta.get('year')
            if year and isinstance(year, str) and year.isdigit():
                year = int(year)
            elif not isinstance(year, int):
                year = None

            # 🔧 Use only the filename – matches your existing DB format
            file_rel_path = filename

            # Update or create
            obj, created = Material.objects.update_or_create(
                file=file_rel_path,
                defaults={
                    'title': title or 'Unknown Title',
                    'author': author or 'Unknown Author',
                    'year': year,
                    'subjects': meta.get('subjects', []),
                    'degree': meta.get('degree', 'Thesis'),
                    'school': meta.get('school', 'Unknown'),
                    'abstract': meta.get('abstract', ''),
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

    # --- Save JSON (exactly as before) ---
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_metadata, f, indent=2, ensure_ascii=False)

    print(f"\n📁 JSON saved: {out_path} ({len(all_metadata)} files)")
    if DJANGO_AVAILABLE:
        print(f"📊 Database: Created {created_count}, Updated {updated_count}")
        print(f"📊 Total materials in DB: {Material.objects.count()}")
    else:
        print("📊 Database: skipped (Django not available)")

if __name__ == "__main__":
    main()