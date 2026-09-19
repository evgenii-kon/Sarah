import json
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from characters import CHARACTERS

router = APIRouter()

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "llama3.2"

SYSTEM_PROMPT_TEMPLATE = """\
You are {character}, a friendly native English speaker.
Your job is to have a lively, natural conversation with a user who is learning English.

After every user message you must return a JSON object with exactly these fields:
- "reply": your response to the user as a conversation partner
- "errors": a list of grammar errors found in the user's message
- "corrected_message": the corrected version of the user's message

Each item in "errors" must have this shape:
- "original": the fragment of the user's message that contains the mistake
- "correction": the corrected fragment
- "explanation": a short explanation of the mistake

Strict rules:
- Write "reply" and "explanation" ONLY in English. Never use any other language.
- "errors" must NEVER be empty if the user's message contains any grammar mistakes. List every mistake you find.
- If there are no mistakes, return "errors" as an empty array [] and "corrected_message" equal to the user's message.
- Return ONLY valid JSON, with no markdown, no code fences and no extra text.

Example of a valid response:
{{
  "reply": "Great effort! Keep practicing.",
  "errors": [
    {{
      "original": "from three months",
      "correction": "for three months",
      "explanation": "Use 'for' with periods of time"
    }}
  ],
  "corrected_message": "I have been studying English for three months."
}}
"""


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    character: Literal["sarah", "jake"]
    history: list[HistoryMessage] = []


class ErrorItem(BaseModel):
    original: str
    correction: str
    explanation: str


class ChatResponse(BaseModel):
    reply: str
    errors: list[ErrorItem]
    corrected_message: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    character_name = CHARACTERS[request.character]["name"]
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(character=character_name)

    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": m.role, "content": m.content} for m in request.history]
    messages.append({"role": "user", "content": request.message})

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                OLLAMA_URL,
                json={"model": MODEL, "messages": messages, "stream": False, "format": "json"},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Ollama is not reachable at localhost:11434")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Ollama returned status {response.status_code}")

    raw_text = response.json().get("message", {}).get("content", "")

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")

    try:
        return ChatResponse(**parsed)
    except Exception:
        raise HTTPException(status_code=502, detail="Model response did not match expected schema")
