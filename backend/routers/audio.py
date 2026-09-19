import os
import tempfile

import whisper
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

router = APIRouter()

WHISPER_MODEL_NAME = "medium"

_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = whisper.load_model(WHISPER_MODEL_NAME)
    return _whisper_model


class TranscribeResponse(BaseModel):
    text: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(await file.read())
        tmp.flush()
        model = get_whisper_model()
        result = model.transcribe(tmp.name, language="en")

    return TranscribeResponse(text=result["text"].strip())
