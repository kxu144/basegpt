from . import logger, router


@router.get("/list")
def list_conversations():
    return []
