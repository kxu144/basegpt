from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# load environment variables
from dotenv import load_dotenv

assert load_dotenv("app/envs/.env")
assert load_dotenv("app/envs/.env.credentials")

# Import database to initialize connection and tables
from app.utils.database import Base, engine
from app.models import *
Base.metadata.create_all(bind=engine)


def create_app():
    app = FastAPI()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # or ["http://localhost:3000"] for stricter control
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/status")
    def read_root():
        return {"message": "Success"}

    from app.views.conversation import conversation_router
    from app.views.qa import qa_router

    app.include_router(conversation_router)
    app.include_router(qa_router)

    return app
