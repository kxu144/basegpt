from datetime import datetime
from typing import Optional
import uuid
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.utils.llm import call_openai

qa_router = APIRouter()


class QaRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str


@qa_router.post("/qa")
async def qa(request: QaRequest):
    conversation_id = request.conversation_id or str(uuid.uuid4())
    # verify conversation_id is a valid uuid
    if not uuid.UUID(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    response = await call_openai(
        model="gpt-5-nano", messages=[{"role": "user", "content": request.message}]
    )
    return {
        "conversation_id": conversation_id,
        "assistant_message": {
            "text": response.output_text,
            "created_at": datetime.now().isoformat(),
        },
    }
