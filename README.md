🚀 TrustMedAI – Semantic Medical Conversational Agent
A retrieval-augmented, speech-enabled conversational system for medical question answering, combining authoritative guidelines with community-generated insights.


📌 Overview
TrustMedAI is an intelligent medical assistant designed to answer health-related questions — with a special focus on Type 2 Diabetes — using a hybrid knowledge pipeline:
Authoritative medical content (ADA, Mayo Clinic, NIH)
Real patient discussions scraped from diabetes forums
Semantic similarity + KRT (Key Recurring Themes) extraction
FAISS vector search + MiniLM sentence embeddings
LLM-powered answer generation (Nemotron)
Speech interface via STT + TTS (ElevenLabs)
The system transforms raw web content → structured metadata → vectorized embeddings → semantic retrieval → final conversational answers.
🏗️ System Architecture
       Raw Data
          │
          ▼
  Scraping (Selenium, BS4)
          │
          ▼
Cleaning + Dedupe + KRT Clustering
          │
          ▼
Embedding (MiniLM)
          │
          ▼
FAISS Vector Database + Metadata Store
          │
          ▼
Retriever → Nemotron LLM → Final Answer
          │
          ▼
     TTS + Frontend UI


     
🧠 Core Features
🔍 Semantic Retrieval: MiniLM embeddings + FAISS L2 vector search
🧵 KRT Categorization: Clusters forum questions into meaningful themes
🤖 RAG Pipeline: Retrieval-augmented generation using Nemotron
🎙️ Speech Interface: Whisper STT + ElevenLabs TTS
🧹 Data Cleaning & Dedupe: Regex normalization + SequenceMatcher
🗄️ Unified Knowledge Base: Combines medical docs + forum metadata



📂 Folder Structure
TrustMedAI/
│
├── Code/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py                # FastAPI backend entrypoint
│   │   │   ├── retriever.py           # Retrieves relevant chunks from FAISS
│   │   │   ├── answer_generator.py    # LLM answer synthesis (Nemotron)
│   │   │   ├── tts.py                 # ElevenLabs TTS endpoint
│   │   │   ├── stt.py                 # Optional: Whisper STT
│   │   │   ├── forum_scraper.py       # Selenium forum scraper
│   │   │   ├── dedupe_questions.py    # Cleans + clusters forum data
│   │   │   ├── vector_store.py        # Builds FAISS embeddings + metadata
│   │   │   ├── utils/                 # Helper utilities
│   │   │
│   │   ├── requirements.txt
│   │   └── ...
│   │
│   └── frontend/
│       ├── src/
│       ├── public/
│       └── package.json
│
├── Data/
│   ├── raw/                           # Raw scraped text from websites + forums
│   ├── processed/                     # Cleaned + structured JSON files
│   ├── embeddings/                    # FAISS index + vectors + metadata
│
├── SEMANTIC.pptx                      # Project presentation
└── README.md



⚙️ Installation Guide
1. Clone the Repository
git clone https://github.com/<your-username>/TrustMedAI.git
cd TrustMedAI/Code/backend

3. Create a Virtual Environment
python3 -m venv venv
source venv/bin/activate

5. Install Backend Dependencies
pip install -r requirements.txt
This installs:
FastAPI
FAISS
SentenceTransformers
Transformers
Selenium
NumPy
BeautifulSoup
ElevenLabs SDK
Uvicorn

7. Install Frontend Dependencies
cd ../frontend
npm install

9. Selenium Setup
ChromeDriver is installed automatically via webdriver-manager.
No manual setup required.


🔐 Environment Variables (.env)
Create a .env file inside:
Code/backend/app/.env
Add:
# ElevenLabs TTS
ELEVENLABS_API_KEY=your_key_here

# NVIDIA Nemotron / NIM Endpoint
NVIDIA_API_KEY=your_key_here
NVIDIA_MODEL_ENDPOINT=https://api.nvidia.com/v1/nemotron

# Optional: STT service (if using external STT)
OPENAI_API_KEY=your_key_here


▶️ Running the Backend
From the backend directory:
uvicorn app.main:app --reload --port 8000
Backend URL:
👉 http://127.0.0.1:8000
Check health:
GET /health
💻 Running the Frontend
cd TrustMedAI/Code/frontend
npm run dev
Frontend URL:
👉 http://localhost:5173
📡 API Endpoints
POST /chat
Input:
{
  "message": "What are early symptoms of Type 2 Diabetes?",
  "disease": "Type 2 Diabetes"
}
Output:
{
  "answer": "...",
  "sources": [...]
}
POST /tts
Converts text → natural speech via ElevenLabs.
GET /health
Backend heartbeat.


🧱 Building the Vector Store (FAISS)
Whenever processed data changes:
python vector_store.py
This generates:
Data/embeddings/t2dm_index.faiss
Data/embeddings/vectors.npy
Data/embeddings/metadata.json


🔍 RAG Pipeline — How It Works
Query → embed with MiniLM
FAISS returns top-k relevant chunks
Combined chunks include:
medical guideline text
categorized forum insights
Nemotron generates a grounded, safe answer
TTS converts answer → speech (optional)


🧪 Testing the Retriever
python retriever.py
You will see the ranked retrieval outputs.


🤝 Contributors
Kaushik Rajesh
Sivaraman Kalaivani
Ravichandran Aneesh
Prabhu Jayan
Muskaan

📌 Future Enhancements
Multi-disease support
Medical ontology integration (SNOMED/ICD-10)
Hallucination-reduction layer
Better source explanation in UI
Real-time streaming response generation
