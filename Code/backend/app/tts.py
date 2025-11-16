import os
import base64
import requests
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY") 
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "DLsHlh26Ugcm6ELvS0qi")

ELEVENLABS_TTS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"


class TTSRequest(BaseModel):
  text: str


@router.post("/tts")
def generate_tts(req: TTSRequest):
  """
  Simple TTS endpoint using ElevenLabs.
  Input:  { "text": "..." }
  Output: { "audio": "<base64-encoded-mp3>" }
  """

  print("🔵 Incoming ElevenLabs TTS request:", req.text)

  if not ELEVENLABS_API_KEY:
    print("❌ ELEVENLABS_API_KEY is missing")
    return {"error": "Missing ELEVENLABS_API_KEY"}

  headers = {
    "xi-api-key": ELEVENLABS_API_KEY,
    "Content-Type": "application/json",
    "Accept": "audio/mpeg",
  }

  payload = {
    "text": req.text,
    # you can change model/voice settings here if you want
    "model_id": "eleven_turbo_v2",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75,
      "style": 0.3,
      "use_speaker_boost": True,
    },
  }

  print("🟡 Sending request to ElevenLabs...")

  try:
    response = requests.post(ELEVENLABS_TTS_URL, headers=headers, json=payload)
  except Exception as e:
    print("🔴 Network error calling ElevenLabs:", e)
    return {"error": "Network error calling ElevenLabs", "details": str(e)}

  print("🟢 ElevenLabs status:", response.status_code)

  if response.status_code != 200:
    # try to print any error info
    try:
      print("❌ ElevenLabs error JSON:", response.json())
      return {"error": "TTS failed", "details": response.json()}
    except Exception:
      print("❌ ElevenLabs error (non-JSON):", response.text)
      return {"error": "TTS failed", "details": response.text}

  audio_bytes = response.content
  print("📦 Received audio bytes:", len(audio_bytes))

  # base64 encode for frontend
  audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

  return {"audio": audio_b64}
