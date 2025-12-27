import os
import openai
from typing import AsyncIterator, Union

client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def call_openai(model: str, messages: list[dict], **kwargs):
    """
    Call OpenAI API. If stream=True, returns an async iterator of events.
    Otherwise, returns the response object.
    """
    return await client.responses.create(
        model=model,
        instructions="You are a helpful assistant.",
        input=messages,
        **kwargs,
    )
