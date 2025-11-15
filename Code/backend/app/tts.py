import base64
import os
import requests
from dotenv import load_dotenv
load_dotenv()

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")
CARTESIA_URL = "https://api.cartesia.ai/tts"


class TTSRequest(BaseModel):
    text: str


@router.post("/tts")
def generate_tts(req: TTSRequest):
    headers = {
        "Authorization": f"Bearer {CARTESIA_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "sonic",
        "voice": "lily",     # natural female clinical voice
        "format": "mp3",
        "text": req.text
    }

    response = requests.post(CARTESIA_URL, json=payload, headers=headers)

    if response.status_code != 200:
        return {"error": "TTS failed", "details": response.text}

    audio_b64 = response.json()["audio"]

    return {"audio": audio_b64}
