from fastapi import APIRouter

qa_router = APIRouter()


@qa_router.get("/qa")
async def qa():
    return {}
