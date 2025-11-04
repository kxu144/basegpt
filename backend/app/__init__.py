from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


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
