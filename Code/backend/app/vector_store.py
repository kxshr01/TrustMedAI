import json
import os
from pathlib import Path
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

PROCESSED_DIR = Path("/Users/kaushikrajesh/Desktop/SEM3/SWM/TrustMedAI/Data/processed")
EMBED_DIR = Path("/Users/kaushikrajesh/Desktop/SEM3/SWM/TrustMedAI/Data/embeddings")
EMBED_DIR.mkdir(exist_ok=True, parents=True)

model = SentenceTransformer("all-MiniLM-L6-v2")

def load_all_sources():
    files = list(PROCESSED_DIR.glob("*.json"))
    all_chunks = []
    for fp in files:
        source_id = fp.stem
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Flatten sections into chunks
        for section in data:
            sec_name = section["section"]

            for idx, sub in enumerate(section["subsections"]):
                sub_name = sub["title"]
                content_list = sub["content"]

                # Combine content into one chunk
                text = "\n".join(content_list)

                chunk = {
                    "text": text,
                    "source": source_id,
                    "section": sec_name,
                    "subsection": sub_name,
                    "chunk_id": f"{source_id}_{sec_name}_{idx}"
                }

                all_chunks.append(chunk)

    return all_chunks


def build_faiss_index():
    chunks = load_all_sources()
    texts = [c["text"] for c in chunks]

    embeddings = model.encode(texts, convert_to_numpy=True)
    dim = embeddings.shape[1]

    # Create FAISS index
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    # Save index + metadata
    faiss.write_index(index, str(EMBED_DIR / "t2dm_index.faiss"))
    np.save(str(EMBED_DIR / "vectors.npy"), embeddings)

    with open(EMBED_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2)

    print("[INFO] Vector DB created with", len(chunks), "chunks.")


if __name__ == "__main__":
    build_faiss_index()
