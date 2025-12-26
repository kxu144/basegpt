import os
import openai

client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def call_openai(model: str, messages: list[dict]):
    return await client.responses.create(
        model="gpt-5-nano",
        instructions="You are a helpful assistant.",
        input=messages,
    )