from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.utils.database import get_db
from app.views.auth import get_current_user_obj
from app.models.database import Conversation, Message

conversation_router = APIRouter(prefix="/c")


@conversation_router.get("/list")
async def list_conversations(
    user=Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db),
):
    # Filter conversations by user email
    result = await db.execute(
        select(Conversation)
        .filter(Conversation.user_email == user.email, Conversation.hidden == False)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()

    # Format response
    return [
        {
            "id": conv.id,
            "title": conv.title,
            "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
            "snippet": "",  # Could add snippet logic here
        }
        for conv in conversations
    ]


@conversation_router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user=Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db),
):
    # Get conversation by ID and user email with messages ordered by created_at
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .filter(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation or conversation.user_email != user.email or conversation.hidden:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conversation.id,
        "title": conversation.title,
        "updated_at": (
            conversation.updated_at.isoformat() if conversation.updated_at else None
        ),
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "created_at": (
                    message.created_at.isoformat() if message.created_at else None
                ),
            }
            for message in conversation.messages
        ],
    }
