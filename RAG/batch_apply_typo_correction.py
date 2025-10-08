import os
from llm_typo_correction import correct_text_with_llm

# Set your Gemini API key here or use an environment variable
API_KEY = os.environ.get("GEMINI_API_KEY")

THESIS_DIR = os.path.join(os.path.dirname(__file__), "theses")

def process_all_txt_files(thesis_dir, api_key):
    for fname in os.listdir(thesis_dir):
        if fname.lower().endswith(".txt"):
            fpath = os.path.join(thesis_dir, fname)
            print(f"Processing: {fname}")
            with open(fpath, "r", encoding="utf-8") as f:
                text = f.read()
            corrected = correct_text_with_llm(text, api_key)
            if corrected != text:
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(corrected)
                print(f"Corrected and saved: {fname}")
            else:
                print(f"No changes for: {fname}")

if __name__ == "__main__":
    if not API_KEY:
        print("Error: GEMINI_API_KEY environment variable not set.")
    else:
        process_all_txt_files(THESIS_DIR, API_KEY)
