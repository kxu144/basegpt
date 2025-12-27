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
from app.views.auth import get_current_user_obj, verify_token, get_token_from_request

qa_router = APIRouter()


class QaRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str


@qa_router.post("/qa")
async def qa(
    request: QaRequest,
    user=Depends(get_current_user_obj),
    db: AsyncSession = Depends(get_db),
):
    # user is now available from the authenticated session
    conversation_id = request.conversation_id or str(uuid.uuid4())
    # verify conversation_id is a valid uuid
    try:
        uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    # fetch conversation history
    conversation = await db.get(Conversation, conversation_id)
    messages = []
    if conversation:
        messages = [
            {"role": message.role, "content": message.content}
            for message in conversation.messages or []
        ]
    messages.append({"role": "user", "content": request.message})

    # call openai
    start_time = time.time()
    response = await call_openai(model="gpt-5-nano", messages=messages)
    end_time = time.time()
    logger.info(f"Time taken: {end_time - start_time} seconds")

    # create new conversation if none exists
    if not conversation:
        conversation = Conversation(
            id=conversation_id,
            user_email=user.email,  # Use user.email (primary key)
            title=request.message[:100],
        )
        db.add(conversation)
        await db.flush()  # Flush to get the conversation ID

    # save message to database
    # Generate TSVECTOR for full-text search using PostgreSQL's to_tsvector
    user_tsv_result = await db.execute(
        text("SELECT to_tsvector('english', :content)"), {"content": request.message}
    )
    user_tsv = user_tsv_result.scalar()

    assistant_tsv_result = await db.execute(
        text("SELECT to_tsvector('english', :content)"),
        {"content": response.output_text},
    )
    assistant_tsv = assistant_tsv_result.scalar()

    user_message = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role="user",
        content=request.message,
        content_tsv=user_tsv,
        created_at=datetime.now(),
    )
    assistant_message = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role="assistant",
        content=response.output_text,
        content_tsv=assistant_tsv,
        created_at=datetime.now(),
    )
    db.add(user_message)
    db.add(assistant_message)
    await db.commit()

    return {
        "conversation_id": conversation_id,
        "assistant_message": {
            "text": response.output_text,
            "created_at": datetime.now().isoformat(),
        },
    }


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
                stream = await call_openai(
                    model="gpt-5-nano", messages=messages, stream=True
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
                        logger.warning(f"Unknown event type: {event}")
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
