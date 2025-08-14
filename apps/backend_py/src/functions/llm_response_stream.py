import os
from typing import Any, Literal

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel
from restack_ai.function import (
    NonRetryableError,
    function,
    log,
    stream_to_websocket,
)

from src.client import api_address

load_dotenv()

class Message(BaseModel):
    role: Literal["developer", "user", "assistant"]
    content: str

class LlmResponseOutput(BaseModel):
    events: list[dict[str, Any]] | None = None
    text: str | None = None
    event_count: int | None = None
    final_response: dict[str, Any] | None = None
    response_id: str | None = None
    usage: dict[str, Any] | None = None
    has_completion: bool | None = None

class LlmResponseInput(BaseModel):
    create_params: dict[str, Any]

@function.defn()
async def llm_response_stream(
    function_input: LlmResponseInput,
) -> LlmResponseOutput:
    try:
        log.info("llm_response started (execute)", create_params=function_input.create_params)
        if os.environ.get("OPENAI_API_KEY") is None:
            error_msg = "OPENAI_API_KEY is not set"
            raise NonRetryableError(message=error_msg)  # noqa: TRY301

        client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        response = await client.responses.create(**function_input.create_params)

        response_data = await stream_to_websocket(
            api_address=api_address, data=response
        )
        log.info("llm_response completed (execute)", response=response_data)

        # Convert the response_data to our proper output model
        final_response = response_data.get("final_response")
        if final_response and hasattr(final_response, "model_dump"):
            final_response = final_response.model_dump()
        elif final_response and hasattr(final_response, "__dict__"):
            final_response = final_response.__dict__

        # Handle usage - convert to dict if it's an object
        usage = response_data.get("usage")
        if usage and hasattr(usage, "model_dump"):
            usage = usage.model_dump()
        elif usage and hasattr(usage, "__dict__"):
            usage = usage.__dict__

        return LlmResponseOutput(
            events=response_data.get("events", []),
            text=response_data.get("text", ""),
            event_count=response_data.get("event_count", 0),
            final_response=final_response,
            response_id=response_data.get("response_id"),
            usage=usage,
            has_completion=response_data.get("has_completion", False),
        )
    except Exception as e:
        error_message = f"llm_response failed: {e}"
        raise NonRetryableError(error_message) from e
