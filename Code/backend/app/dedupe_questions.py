import json
from pathlib import Path
import re
from difflib import SequenceMatcher

RAW_FILE = Path("/Users/kaushikrajesh/Desktop/SEM3/SWM/TrustMedAI/Data/raw/forum_raw.json")
OUT_DIR = Path("/Users/kaushikrajesh/Desktop/SEM3/SWM/TrustMedAI/Data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)

OUT_FILE = OUT_DIR / "forums_t2dm.json"

# ------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------

def clean_text(text: str) -> str:
    """Basic cleaning for forum text."""
    text = text.strip()
    text = re.sub(r"\s+", " ", text)  # collapse multiple spaces
    text = re.sub(r"\n+", "\n", text)  # collapse newlines
    return text


def are_similar(q1: str, q2: str, threshold=0.80) -> bool:
    """Simple question duplicate detection using fuzzy matching."""
    ratio = SequenceMatcher(None, q1.lower(), q2.lower()).ratio()
    return ratio >= threshold


# ------------------------------------------------------------
# Load data
# ------------------------------------------------------------

with open(RAW_FILE, "r", encoding="utf-8") as f:
    raw = json.load(f)

print(f"[INFO] Loaded {len(raw)} raw forum threads.")

questions = [clean_text(item["question"]) for item in raw]
answers = [[clean_text(a) for a in item["answers"]] for item in raw]
urls = [item["url"] for item in raw]

# ------------------------------------------------------------
# Deduplicate questions
# ------------------------------------------------------------

clusters = []
visited = set()

for i, q in enumerate(questions):
    if i in visited:
        continue

    cluster = [i]
    visited.add(i)

    for j in range(i + 1, len(questions)):
        if j in visited:
            continue

        if are_similar(q, questions[j]):
            cluster.append(j)
            visited.add(j)

    clusters.append(cluster)

print(f"[INFO] Found {len(clusters)} unique question groups after dedupe.")

# ------------------------------------------------------------
# Build output dataset
# ------------------------------------------------------------

output = []

for cluster in clusters:
    base_idx = cluster[0]
    section_heading = questions[base_idx]

    merged_answers = []
    merged_urls = []

    for idx in cluster:
        merged_answers.extend(answers[idx])
        merged_urls.append(urls[idx])

    cleaned_merged_answers = [clean_text(a) for a in merged_answers if a]

    entry = {
        "section": section_heading,
        "answer": cleaned_merged_answers,
        "source_urls": list(set(merged_urls)),
        "num_threads_clustered": len(cluster)
    }

    output.append(entry)

# ------------------------------------------------------------
# Save
# ------------------------------------------------------------

with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print("[SUCCESS] Processed dataset saved at:", OUT_FILE)
