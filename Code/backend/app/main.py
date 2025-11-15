from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware
from .answer_generator import generate_answer
from .tts import router as tts_router


load_dotenv()
app = FastAPI()
app.include_router(tts_router)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]
# Allow your React frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # during development allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    disease: str = "Type 2 Diabetes"

class ChatResponse(BaseModel):
    answer: str
    sources: list

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    print(f"[BACKEND] User asked: {req.message}")

    result = generate_answer(req.message, req.disease)

    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"]
    )


@app.get("/health")
async def health():
    return {"status": "OK", "model": "NVIDIA Nemotron 49B + TrustMedAI RAG"}
