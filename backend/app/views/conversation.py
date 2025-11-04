from fastapi import APIRouter

conversation_router = APIRouter(prefix="/c")


@conversation_router.get("/list")
async def list_conversations():
    return []
