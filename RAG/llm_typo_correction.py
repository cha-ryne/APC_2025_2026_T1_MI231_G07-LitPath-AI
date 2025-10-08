def correct_text_with_llm(text, api_key):
    """
    Use Gemini API to correct typographical and grammatical errors in the given text.
    Returns the corrected text, or original if API fails.
    """
    import requests
    import re
    abstract_match = re.search(r'(?:^|\n)abstract[:\s\-]*\n?(.*?)(?:\n\s*keywords?:|\n\s*introduction|\n\s*$)', text, re.IGNORECASE | re.DOTALL)
    abstract = abstract_match.group(1).strip() if abstract_match else ""
    max_iters = 3
    prev_text = text
    for _ in range(max_iters):
        prompt = (
            "You are an expert academic proofreader. "
            "Correct only typographical errors (misspellings, character mistakes, or accidental substitutions) in the following academic text, using the provided abstract as a reference for technical terms, symbols, and Greek letters. "
            "Do not change grammar, style, or sentence structure. Do not paraphrase or reword. "
            "Preserve all technical terms, chemical symbols, units, and Greek letters (e.g., α, β, γ, Δ, μ, etc.) as they appear in the abstract. "
            "If you encounter a word or symbol in the main text that is similar to one in the abstract, correct it to match the abstract's spelling and formatting. "
            "Do not change proper nouns or technical terms. Stop once all typographical errors are replaced. Return only the corrected main text.\n\n"
            f"Abstract (reference):\n{abstract}\n\nMain Text to Correct:\n{prev_text}"
        )
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        headers = {"Content-Type": "application/json", "X-goog-api-key": api_key}
        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 4096}
        }
        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            corrected = result['candidates'][0]['content']['parts'][0]['text'].strip()
            if corrected == prev_text:
                return corrected
            prev_text = corrected
        except Exception as e:
            print(f"[LLM Correction Error] {e}")
            return prev_text
    return prev_text
