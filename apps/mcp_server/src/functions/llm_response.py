import os
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel
from restack_ai.function import (
    NonRetryableError,
    function,
    log,
)

load_dotenv()


class LlmResponseInput(BaseModel):
    create_params: dict[str, Any]


@function.defn()
async def llm_response(
    function_input: LlmResponseInput,
) -> str:
    try:
        log.info(
            "llm_response started (execute)",
            create_params=function_input.create_params,
        )
        if os.environ.get("OPENAI_API_KEY") is None:
            error_msg = "OPENAI_API_KEY is not set"
            raise NonRetryableError(message=error_msg)  # noqa: TRY301

        client = AsyncOpenAI(
            api_key=os.environ.get("OPENAI_API_KEY")
        )

        response = await client.chat.completions.create(
            **function_input.create_params
        )

        log.info(
            "llm_response completed (non_streaming_response)",
            response=response,
        )

    except Exception as e:
        error_message = f"llm_response failed: {e}"
        raise NonRetryableError(error_message) from e

    return response.choices[0].message.content
