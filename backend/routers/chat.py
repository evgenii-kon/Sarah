import json
import os
from typing import Literal

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from characters import CHARACTERS

router = APIRouter()

MODEL = "claude-sonnet-4-5"

SYSTEM_PROMPT_TEMPLATE = """\
Ты дружелюбный носитель английского языка по имени {character}.
Твоя задача — вести живой разговор с пользователем который учит английский.

После каждого сообщения пользователя ты должен вернуть JSON:
{{
  "reply": "твой ответ как собеседник",
  "errors": [список грамматических ошибок если есть],
  "corrected_message": "исправленная версия сообщения пользователя"
}}

Каждый элемент в errors должен иметь вид:
{{
  "original": "фрагмент с ошибкой",
  "correction": "исправленный фрагмент",
  "explanation": "краткое объяснение ошибки"
}}

Если ошибок нет — errors возвращай пустым массивом [].
Отвечай только валидным JSON, без markdown, без пояснений.
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


_client = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY is not set")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    character_name = CHARACTERS[request.character]["name"]
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(character=character_name)

    messages = [{"role": m.role, "content": m.content} for m in request.history]
    messages.append({"role": "user", "content": request.message})

    client = get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    )

    raw_text = "".join(block.text for block in response.content if block.type == "text")

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")

    try:
        return ChatResponse(**parsed)
    except Exception:
        raise HTTPException(status_code=502, detail="Model response did not match expected schema")
