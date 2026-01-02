from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# load environment variables
from dotenv import load_dotenv

assert load_dotenv("app/envs/.env")
assert load_dotenv("app/envs/.env.credentials")

# set up logging
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Import database to initialize connection and tables
from app.utils.database import Base, engine, init_models
from app.models import *

WEBSERVER_URL = os.getenv("WEBSERVER_URL")
assert WEBSERVER_URL, "WEBSERVER_URL is not set"


def create_app():
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await init_models()
        yield
        await engine.dispose()

    app = FastAPI(lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[WEBSERVER_URL],
        allow_credentials=True,  # Important for cookies
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/status")
    def read_root():
        return {"message": "Success"}

    from app.views.auth import auth_router
    from app.views.conversation import conversation_router
    from app.views.qa import qa_router
    from app.views.keys import keys_router

    app.include_router(auth_router)
    app.include_router(conversation_router)
    app.include_router(qa_router)
    app.include_router(keys_router)

    logger.info("App initialized")
    return app
