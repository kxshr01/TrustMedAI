import os
from dotenv import load_dotenv

load_dotenv()

from textwrap import dedent
from typing import List, Dict

# Google Gemini API
from google import genai  
from google.genai.types import GenerateContentConfig

from .retriever import retrieve_chunks


# ============================================================
# Load Gemini Client (Google GenAI)
# ============================================================
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
print("[DEBUG] GEMINI API KEY LOADED:", bool(os.getenv("GEMINI_API_KEY")))


# ------------------------------------------------------------
# Helper: Format retrieved RAG chunks
# ------------------------------------------------------------
def format_context(chunks: List[Dict]) -> str:
    lines = []
    for c in chunks:
        src = c["source"]

        # Human readable
        if src.startswith("mayo"):
            src_name = "Mayo Clinic"
        elif src.startswith("nih"):
            src_name = "NIH / NIDDK"
        elif src.startswith("medlineplus"):
            src_name = "MedlinePlus"
        else:
            src_name = src

        lines.append(f"[Source: {src_name} | {c['section']} | {c['subsection']}]")
        lines.append(c["text"])
        lines.append("")
    return "\n".join(lines).strip()


# ------------------------------------------------------------
# Main RAG Answer Generator (Gemini Flash)
# ------------------------------------------------------------
def generate_answer(question: str, disease="Type 2 Diabetes", k: int = 5) -> Dict:
    """
    Uses FAISS retrieval + Gemini Flash model for grounded answers.
    """

    # 1. Retrieve relevant context
    chunks = retrieve_chunks(question, k)
    context = format_context(chunks)

    # --------------------------------------------------------
    # 2. Build RAG Prompt
    # --------------------------------------------------------
    prompt = dedent(f"""
    You are TrustMedAI, a safe and helpful medical education assistant.

    USER QUESTION:
    {question}

    CONTEXT (USE ONLY THIS INFORMATION):
    {context}

    GUIDELINES:
    - Base your answer ONLY on the provided context.
    - DO NOT invent facts or add medical advice.
    - DO NOT diagnose or suggest treatments/medications.
    - Write clearly and cite sources (“According to Mayo Clinic…”).
    - Keep tone factual and calm.

    RESPONSE STYLE:
    - Keep the answer **short, clear, and easy to read**.
    - Use **2–5 bullet points**, not long paragraphs.
    - Do NOT write citations inside the explanation.
    - Use simple language (8th–10th grade level).
    - Do NOT diagnose or give treatment advice.
    - NEVER invent facts not present in the context.

    FORMAT EXACTLY LIKE THIS:

    <Answer in short bullet points>

    Do you have any more questions? Or Would you like me to help you schedule an appointment with a doctor or clinic?

    """).strip()

    # --------------------------------------------------------
    # 3. Call Google Gemini Flash Model
    # --------------------------------------------------------
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=GenerateContentConfig(
            temperature=0.6,
            top_p=0.95,
            max_output_tokens=1500,
        ),
    )

    llm_answer = response.text.strip()

    # --------------------------------------------------------
    # 4. Return answer + retrieval metadata
    # --------------------------------------------------------
    return {
        "answer": llm_answer,
        "sources": [
            {
                "source": c["source"],
                "section": c["section"],
                "subsection": c["subsection"],
            }
            for c in chunks
        ],
        "disclaimer": "⚠️ The information provided is for general educational purposes only. It is NOT a medical diagnosis, , and it is NOT a substitute for professional medical advice. For concerns about your specific health situation, please consult a licensed healthcare professional."
    }
