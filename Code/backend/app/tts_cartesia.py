import base64
import os
import requests
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")
CARTESIA_URL = "https://api.cartesia.ai/api/tts"

class TTSRequest(BaseModel):
    text: str

@router.post("/tts")
def generate_tts(req: TTSRequest):
    print("🔵 Incoming TTS request:", req.text)

    if not CARTESIA_API_KEY:
        print("❌ ERROR: CARTESIA_API_KEY is missing.")
        return {"error": "Missing API key"}

    headers = {
        "Authorization": f"Bearer {CARTESIA_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "sonic",
        "voice": "lily",
        "format": "mp3",
        "text": req.text
    }

    print("🟡 Sending request to Cartesia...")

    response = requests.post(CARTESIA_URL, json=payload, headers=headers)

    print("🟢 Cartesia responded with status:", response.status_code)

    # Print body (cautiously)
    try:
        print("🟣 Cartesia JSON:", response.json())
    except:
        print("🔴 ERROR: Response is not JSON:", response.text)

    if response.status_code != 200:
        print("❌ Cartesia Error:", response.text)
        return {"error": "TTS failed", "details": response.text}

    audio_b64 = response.json().get("audio", "")

    print("📦 Audio Base64 Length:", len(audio_b64))

    return {"audio": audio_b64}
