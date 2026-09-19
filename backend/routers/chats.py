from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from models import Chat, Message

router = APIRouter()


class ChatOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    character: str
    title: str | None
    created_at: datetime
    updated_at: datetime


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chat_id: int
    role: str
    content: str
    errors: list | None
    corrected_message: str | None
    created_at: datetime


class CreateChatRequest(BaseModel):
    character: Literal["sarah", "jake"]


@router.get("/chats", response_model=list[ChatOut])
async def list_chats(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Chat).order_by(Chat.updated_at.desc(), Chat.id.desc()))
    return result.scalars().all()


@router.post("/chats", response_model=ChatOut, status_code=201)
async def create_chat(request: CreateChatRequest, session: AsyncSession = Depends(get_session)):
    chat = Chat(character=request.character)
    session.add(chat)
    await session.commit()
    await session.refresh(chat)
    return chat


@router.get("/chats/{chat_id}/messages", response_model=list[MessageOut])
async def get_messages(chat_id: int, session: AsyncSession = Depends(get_session)):
    if await session.get(Chat, chat_id) is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    result = await session.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at, Message.id)
    )
    return result.scalars().all()


@router.delete("/chats/{chat_id}", status_code=204)
async def delete_chat(chat_id: int, session: AsyncSession = Depends(get_session)):
    chat = await session.get(Chat, chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    await session.delete(chat)
    await session.commit()
    return Response(status_code=204)
