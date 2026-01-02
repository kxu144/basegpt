from datetime import datetime
import time
from typing import Optional
import uuid
from fastapi import (
    APIRouter,
    HTTPException,
    Request,
    Depends,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app import logger
from app.utils.database import get_db
from app.utils.llm import call_openai
from app.models.database import Conversation, Message
from app.utils.utils import timer
from app.views.auth import get_current_user_obj, verify_token, get_token_from_request

qa_router = APIRouter()


class QaRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str


@qa_router.post("/qa", deprecated=True)
@timer
async def qa(
    request: QaRequest,
    user=Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import JSONResponse
    return JSONResponse(content={"message": "Deprecated"}, status_code=410)


@qa_router.websocket("/ws")
async def qa_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for streaming QA responses.
    Protocol:
    - Client sends: { "type": "query", "conversation_id": "...", "message": "..." }
    - Server sends chunks: { "type": "chunk", "query_id": "...", "content": "...", "conversation_id": "..." }
    - Server sends done: { "type": "done", "query_id": "...", "content": "...", "conversation_id": "...", "created_at": "..." }
    - Server sends error: { "type": "error", "query_id": "...", "content": "..." }
    """
    await websocket.accept()

    from app.utils.database import SessionLocal
    from app.models.database import User

    async with SessionLocal() as db:
        try:
            # Get authentication token from query params or cookie
            token = None
            if "token" in websocket.query_params:
                token = websocket.query_params["token"]
            elif "session_token" in websocket.cookies:
                token = websocket.cookies["session_token"]

            if not token:
                await websocket.send_json(
                    {"type": "error", "content": "Authentication required"}
                )
                await websocket.close()
                return

            # Verify token and get user
            try:
                payload = verify_token(token)
                email = payload["email"]

                result = await db.execute(select(User).filter(User.email == email))
                user = result.scalar_one_or_none()
                if not user:
                    raise HTTPException(status_code=404, detail="User not found")
            except Exception as e:
                await websocket.send_json(
                    {"type": "error", "content": f"Authentication failed: {str(e)}"}
                )
                await websocket.close()
                return

            # Main message loop - handle multiple queries on one connection
            while True:
                data = await websocket.receive_json()

                if data.get("type") != "query":
                    await websocket.send_json(
                        {
                            "type": "error",
                            "content": "Invalid message type. Expected 'query'",
                        }
                    )
                    continue

                query_id = str(uuid.uuid4())
                conversation_id = data.get("conversation_id") or str(uuid.uuid4())
                message = data.get("message", "")

                # Start timing for this query
                query_start_time = time.time()

                if not message:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "query_id": query_id,
                            "content": "Message is required",
                        }
                    )
                    continue

                try:
                    uuid.UUID(conversation_id)
                except ValueError:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "query_id": query_id,
                            "content": "Invalid conversation_id",
                        }
                    )
                    continue

                # Validate entities
                for entity in data.get("entities", []):
                    start, end, entity_id = entity["start"], entity["end"], entity["id"]
                    extracted_message = message[start:end]
                    if extracted_message != entity_id:
                        await websocket.send_json(
                            {
                                "type": "error",
                                "query_id": query_id,
                                "content": f"Invalid entity: {extracted_message} != {entity_id}",
                            }
                        )
                        continue

                # Fetch conversation history
                conversation = await db.get(Conversation, conversation_id)
                messages = []
                if conversation:
                    if conversation.user_email != user.email or conversation.hidden:
                        await websocket.send_json(
                            {
                                "type": "error",
                                "query_id": query_id,
                                "content": "Conversation not found",
                            }
                        )
                        continue

                    messages_result = await db.execute(
                        select(Message)
                        .filter(Message.conversation_id == conversation_id)
                        .order_by(Message.created_at.asc())
                    )
                    db_messages = messages_result.scalars().all()
                    messages = [
                        {"role": msg.role, "content": msg.content}
                        for msg in db_messages
                    ]

                messages.append({"role": "user", "content": message})

                # Create conversation if it doesn't exist
                if not conversation:
                    conversation = Conversation(
                        id=conversation_id,
                        user_email=user.email,
                        title=message[:100],
                    )
                    db.add(conversation)
                    await db.flush()

                # Save user message to database
                user_tsv_result = await db.execute(
                    text("SELECT to_tsvector('english', :content)"),
                    {"content": message},
                )
                user_tsv = user_tsv_result.scalar()

                user_message = Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conversation_id,
                    role="user",
                    content=message,
                    content_tsv=user_tsv,
                    created_at=datetime.now(),
                )
                db.add(user_message)
                await db.commit()

                # Stream OpenAI response
                full_response = ""
                try:
                    stream = await call_openai(
                        model="gpt-5-nano",
                        messages=messages,
                        stream=True,
                        reasoning={"effort": "minimal"},
                    )

                    async for event in stream:
                        # Extract chunk from event based on OpenAI streaming format
                        chunk = None

                        if event.type == "response.created":
                            # response created, send initial chunk
                            continue
                        elif event.type == "response.output_text.delta":
                            chunk = event.delta
                        else:
                            continue

                        if chunk:
                            full_response += chunk
                            await websocket.send_json(
                                {
                                    "type": "chunk",
                                    "query_id": query_id,
                                    "content": chunk,
                                    "conversation_id": conversation_id,
                                }
                            )
                except Exception as stream_error:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "query_id": query_id,
                            "content": f"Streaming error: {str(stream_error)}",
                        }
                    )
                    continue

                # Save assistant message to database
                assistant_tsv_result = await db.execute(
                    text("SELECT to_tsvector('english', :content)"),
                    {"content": full_response},
                )
                assistant_tsv = assistant_tsv_result.scalar()

                assistant_message = Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_response,
                    content_tsv=assistant_tsv,
                    created_at=datetime.now(),
                )
                db.add(assistant_message)
                await db.commit()

                # Log timing for this query
                query_end_time = time.time()
                query_duration = query_end_time - query_start_time
                logger.info(
                    f"WebSocket query {query_id} took {query_duration:.4f} seconds"
                )

                # Send completion message
                await websocket.send_json(
                    {
                        "type": "done",
                        "query_id": query_id,
                        "content": full_response,
                        "conversation_id": conversation_id,
                        "created_at": datetime.now().isoformat(),
                    }
                )

        except WebSocketDisconnect:
            logger.info("WebSocket disconnected")
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")
            try:
                await websocket.send_json(
                    {"type": "error", "content": f"Error: {str(e)}"}
                )
            except:
                pass
            try:
                await websocket.close()
            except:
                pass
