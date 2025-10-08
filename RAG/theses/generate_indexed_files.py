import os
import json

def main():
    thesis_dir = os.path.join("RAG", "theses")
    txt_files = [os.path.abspath(os.path.join(thesis_dir, f))
                 for f in os.listdir(thesis_dir)
                 if f.endswith('.txt') and os.path.isfile(os.path.join(thesis_dir, f))]
    index_path = os.path.join(thesis_dir, "indexed_files.json")
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(txt_files, f, indent=2)
    print(f"indexed_files.json created with {len(txt_files)} .txt files.")

if __name__ == "__main__":
    main()
