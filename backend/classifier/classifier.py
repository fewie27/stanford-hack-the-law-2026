"""
Gemini-powered content classifier for the secure storage demo.
 
Takes a URL (direct image link OR webpage URL), fetches its content,
and returns a classification + confidence score via prompt engineering.
 
Setup:
    pip install google-genai requests beautifulsoup4
    export GEMINI_API_KEY="your-key-from-aistudio.google.com"
 
Usage:
    result = classify_url("https://example.com/photo.jpg")
    print(result)
    # => { "category": "identity_document", "confidence": 0.92, "summary": "...", ... }
"""
 
import os
import json
import re
import requests
from io import BytesIO
from urllib.parse import urlparse
 
from google import genai
from google.genai import types
from dotenv import load_dotenv
 
# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
 
GEMINI_MODEL = "gemini-2.5-flash"   # free tier, multimodal, fast


load_dotenv("classifier.env") 
# Get API key from environment — never hardcode this
try: 
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
except:
    pass
 
# ---------------------------------------------------------------------------
# URL SPECIFICITY NOTE (surface this to users in the UI)
# ---------------------------------------------------------------------------
#
# TODO: Make clear to the user in the frontend that the URL must point to
# a SPECIFIC piece of content — not a homepage or a broad landing page.
#
# Good examples:
#   - A direct image URL:  https://example.com/uploads/receipt_042.jpg
#   - A specific post:     https://reddit.com/r/pics/comments/abc123/...
#   - A single article:    https://medium.com/@user/my-article-title-12345
#   - A product page:      https://amazon.com/dp/B09XYZ1234
#
# Bad examples:
#   - A homepage:          https://reddit.com
#   - A search results pg: https://google.com/search?q=cats
#   - A broad category:    https://amazon.com/electronics
#
# The classifier works best when the content has a single clear subject.
# An entire website or feed cannot be meaningfully classified into one
# category for secure storage purposes. The more specific the URL, the
# better the classification.
#
# Suggested UI copy:
#   "Paste a link to a specific image, post, or article — not a homepage
#    or search page. The more specific the link, the better we can
#    classify and protect your content."
# ---------------------------------------------------------------------------
 
 
# ---------------------------------------------------------------------------
# CLASSIFICATION CATEGORIES — tuned for the "secure storage" narrative
# ---------------------------------------------------------------------------
# Expand or narrow these to match whatever story you want to tell the judges.
 
CATEGORIES = [
"Sexual or intimate imagery (real or AI-generated)",  

"Sexualized or explicit content involving a real identifiable person (potentially AI-generated)",  

"Synthetic or AI-generated content impersonating a real person", 

"Otherwise harassing",

"Benign or non_harassing"
]

# ---------------------------------------------------------------------------
# THE CLASSIFICATION PROMPT — this is the core "AI feature"
# ---------------------------------------------------------------------------
 
SYSTEM_PROMPT = f"""You are a content classification engine for a secure digital vault.
 
Your job: given the content the user provides (an image, or text extracted from
a webpage), classify it into EXACTLY ONE of these categories:
 
{json.dumps(CATEGORIES, indent=2)}
 
Respond with a JSON object and NOTHING ELSE — no markdown fences, no preamble.
The JSON must have these fields:
 
{{
  "category": "<one of the categories above>",
  "confidence": <float 0.0 to 1.0>,
  "summary": "<1-2 sentence plain-English description of what the content is>",
  "suggested_tags": ["<tag1>", "<tag2>", "<tag3>"]
}}
 
Rules:
- "confidence" reflects how certain you are about the category. Use 0.85+ only
  when the content clearly fits. Use 0.4-0.6 if ambiguous.

- "suggested_tags" should be 2-5 short keywords useful for search/filtering of legal evidence.
- If the content is a webpage with mixed content, classify based on the
  PRIMARY subject matter.
- If you truly cannot classify the content, use "other" with low confidence.
"""
 
 
# ---------------------------------------------------------------------------
# CONTENT FETCHING
# ---------------------------------------------------------------------------
 
# Common image MIME types / extensions we can send directly to Gemini
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff"}
IMAGE_MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
}
 
 
def _looks_like_image_url(url: str) -> bool:
    """Heuristic: does this URL point directly to an image file?"""
    path = urlparse(url).path.lower()
    return any(path.endswith(ext) for ext in IMAGE_EXTENSIONS)
 
 
def _detect_mime_from_headers(headers: dict) -> str | None:
    """Check Content-Type header for image MIME."""
    ct = headers.get("Content-Type", "")
    if ct.startswith("image/"):
        return ct.split(";")[0].strip()
    return None
 
 
def fetch_image_bytes(url: str) -> tuple[bytes, str]:
    """
    Download image from URL. Returns (raw_bytes, mime_type).
    Raises ValueError if the URL doesn't serve an image.
    """
    resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})    
    resp.raise_for_status()
 
    mime = _detect_mime_from_headers(resp.headers)
    if mime:
        return resp.content, mime
 
    # Fallback: guess from extension
    ext = os.path.splitext(urlparse(url).path)[1].lower()
    if ext in IMAGE_MIME_MAP:
        return resp.content, IMAGE_MIME_MAP[ext]
 
    raise ValueError(f"URL does not appear to serve an image: {url}")
 
 
def fetch_webpage_text(url: str) -> str:
    """
    Fetch a webpage and extract its main text content.
    Uses BeautifulSoup for a lightweight text extraction.
    """
    from bs4 import BeautifulSoup
 
    resp = requests.get(url, timeout=15, headers={"User-Agent": "SecureVault/1.0"})
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
 
    # Remove script/style noise
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
 
    text = soup.get_text(separator="\n", strip=True)
 
    # Truncate to ~4000 chars to stay well within token limits for the demo
    # (Gemini can handle much more, but we don't need it for classification)
    if len(text) > 4000:
        text = text[:4000] + "\n...[truncated]"
 
    return text
 
 
# ---------------------------------------------------------------------------
# GEMINI CLASSIFICATION
# ---------------------------------------------------------------------------
 
def classify_url(url: str) -> dict:
    """
    Main entry point. Takes a URL, fetches content, classifies it.
 
    Returns a dict with keys:
        category, confidence, summary, sensitivity, suggested_tags,
        input_type ("image" | "webpage"), url
    """
    if not GEMINI_API_KEY:
        raise EnvironmentError(
            "GEMINI_API_KEY not set. Get one free at https://aistudio.google.com/apikey"
        )
 
    client = genai.Client(api_key=GEMINI_API_KEY)
 
    # --- Determine input type and build the prompt content parts ---
    is_image = _looks_like_image_url(url)
    input_type = "image"
 
    if is_image:
        image_bytes, mime_type = fetch_image_bytes(url)
        contents = [
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            "Classify this image for secure storage.",
        ]
    else:
        try:
            image_bytes, mime_type = fetch_image_bytes(url)
            contents = [
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                "Classify this image for secure storage.",
            ]
        except (ValueError, Exception):
            input_type = "webpage"
            try:
                page_text = fetch_webpage_text(url)
            except requests.exceptions.RequestException as e:
                return {
                    "category": "other",
                    "confidence": 0.0,
                    "summary": f"Could not fetch content: {e}",
                    "suggested_tags": [],
                    "input_type": "error",
                    "url": url,
                }
            contents = [
                f"Classify the following webpage content for secure storage:\n\n{page_text}"
            ]
 
    # --- Call Gemini ---
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,            # low temp = more deterministic classification
            max_output_tokens=500,
        ),
    )
 
    # --- Parse the JSON response ---
    raw = response.text.strip()
 
    # Strip markdown code fences if the model wraps it anyway
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
 
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: if Gemini returns something unparseable, return a
        # structured error rather than crashing the demo
        result = {
            "category": "other",
            "confidence": 0.0,
            "summary": f"Classification failed — raw response: {raw[:200]}",
            "sensitivity": "low",
            "suggested_tags": [],
        }
 
    # Attach metadata useful for the frontend
    result["input_type"] = input_type
    result["url"] = url
 
    return result
 
 
# ---------------------------------------------------------------------------
# QUICK CLI TEST
# ---------------------------------------------------------------------------
 
if __name__ == "__main__":
    import sys
 
    if len(sys.argv) < 2:
        print("Usage: python classifier.py <url>")
        print("  e.g. python classifier.py https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg")
        sys.exit(1)
 
    url = sys.argv[1]
    print(f"\nClassifying: {url}\n")
 
    result = classify_url(url)
    print(json.dumps(result, indent=2))