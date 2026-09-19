import os
import tempfile
from typing import Literal

import httpx
import whisper
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel

from characters import CHARACTERS

router = APIRouter()

WHISPER_MODEL_NAME = "medium"
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = whisper.load_model(WHISPER_MODEL_NAME)
    return _whisper_model


class TranscribeResponse(BaseModel):
    text: str


class SpeakRequest(BaseModel):
    text: str
    character: Literal["sarah", "jake"]


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(await file.read())
        tmp.flush()
        model = get_whisper_model()
        result = model.transcribe(tmp.name)

    return TranscribeResponse(text=result["text"].strip())


@router.post("/speak")
async def speak(request: SpeakRequest):
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY is not set")

    voice_id = os.environ.get(CHARACTERS[request.character]["voice_id_env"])
    if not voice_id:
        raise HTTPException(
            status_code=500,
            detail=f"Voice id for '{request.character}' is not configured",
        )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            ELEVENLABS_TTS_URL.format(voice_id=voice_id),
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": request.text,
                "model_id": "eleven_multilingual_v2",
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="ElevenLabs request failed")

    return Response(content=response.content, media_type="audio/mpeg")
