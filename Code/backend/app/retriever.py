import json
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
import faiss

# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[3]  # TrustMedAI root directory
EMBED_DIR = BASE_DIR / "Data/embeddings"

INDEX_PATH = EMBED_DIR / "t2dm_index.faiss"
VECTORS_PATH = EMBED_DIR / "vectors.npy"
META_PATH = EMBED_DIR / "metadata.json"

# ============================================================
# Model + Index Loading (load once, reuse for all calls)
# ============================================================

print("[INFO] Loading embedding model...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")

print("[INFO] Loading FAISS index...")
index = faiss.read_index(str(INDEX_PATH))

print("[INFO] Loading vector metadata...")
with open(META_PATH, "r", encoding="utf-8") as f:
    metadata = json.load(f)

# Convert to numpy for consistency
embeddings = np.load(VECTORS_PATH)


# ============================================================
# Retrieve top-k chunks
# ============================================================

def retrieve_chunks(query: str, k: int = 5):
    """
    Given a user query, embed it, search FAISS, and return the
    top-k most relevant chunks with metadata.

    Returns: list of dicts
    """

    print(f"[INFO] Retrieving for query: {query}")

    # 1. Embed user query
    query_vec = embedder.encode([query], convert_to_numpy=True)

    # 2. Search FAISS index
    distances, indices = index.search(query_vec, k)

    results = []

    for rank, idx in enumerate(indices[0]):
        item = metadata[idx]

        results.append({
            "rank": rank + 1,
            "text": item["text"],
            "source": item["source"],
            "section": item["section"],
            "subsection": item["subsection"],
            "chunk_id": item["chunk_id"],
            "distance": float(distances[0][rank])
        })

    return results


# ============================================================
# Quick test
# ============================================================

if __name__ == "__main__":
    test_query = "What are the symptoms of type 2 diabetes?"
    results = retrieve_chunks(test_query, k=3)

    print("\n=== RETRIEVAL RESULTS ===")
    for r in results:
        print(f"\n[{r['rank']}] From {r['source']} → {r['section']} / {r['subsection']}")
        print(r["text"])
