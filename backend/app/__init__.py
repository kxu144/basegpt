from fastapi import FastAPI
from .views import conversation_router


def create_app():
    app = FastAPI()

    app.include_router(conversation_router, prefix="/c", tags=["c"])

    return app
