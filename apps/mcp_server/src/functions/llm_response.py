import os
from typing import TYPE_CHECKING, Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel
from restack_ai.function import (
    NonRetryableError,
    function,
    log,
)

if TYPE_CHECKING:
    from openai.types.chat import ChatCompletion

load_dotenv()


class LlmResponseInput(BaseModel):
    create_params: dict[str, Any]


@function.defn()
async def llm_response(  # noqa: C901
    function_input: LlmResponseInput,
) -> str:
    try:
        model = function_input.create_params.get(
            "model", "unknown"
        )
        response_format = function_input.create_params.get(
            "response_format"
        )

        log_data = {
            "model": model,
            "messages_count": len(
                function_input.create_params.get("messages", [])
            ),
            "has_response_format": bool(response_format),
        }

        # Log response format details for debugging
        if response_format:
            log_data["response_format_type"] = (
                response_format.get("type")
            )
            if response_format.get("type") == "json_schema":
                schema_info = response_format.get(
                    "json_schema", {}
                )
                log_data["schema_name"] = schema_info.get("name")
                log_data["schema_strict"] = schema_info.get(
                    "strict"
                )
                # Log top-level schema structure for debugging
                schema = schema_info.get("schema", {})
                if schema:
                    log_data["schema_type"] = schema.get("type")
                    log_data["schema_properties_count"] = len(
                        schema.get("properties", {})
                    )

        log.info("llm_response started", **log_data)

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            msg = "OPENAI_API_KEY is not set"
            raise NonRetryableError(msg)  # noqa: TRY301

        client = AsyncOpenAI(api_key=api_key)

        response: ChatCompletion = (
            await client.chat.completions.create(
                **function_input.create_params
            )
        )

        log.info(
            "llm_response completed",
            model=response.model,
            usage=response.usage.model_dump()
            if response.usage
            else None,
            finish_reason=response.choices[0].finish_reason
            if response.choices
            else None,
            content_length=len(
                response.choices[0].message.content
            )
            if response.choices
            and response.choices[0].message.content
            else 0,
        )

        choice = response.choices[0]

        # Check for refusal
        if choice.message.refusal:
            msg = f"LLM refused: {choice.message.refusal}"
            raise NonRetryableError(msg)  # noqa: TRY301

        # Extract content
        content = choice.message.content
        if not content:
            msg = f"LLM returned empty content. Finish reason: {choice.finish_reason}"
            raise NonRetryableError(msg)  # noqa: TRY301
        return content  # noqa: TRY300

    except NonRetryableError:
        raise
    except Exception as e:
        error_details = {
            "error": str(e),
            "error_type": type(e).__name__,
            "model": function_input.create_params.get(
                "model", "unknown"
            ),
        }

        # Try to extract OpenAI specific error details
        if hasattr(e, "body"):
            error_details["openai_body"] = e.body
        if hasattr(e, "status_code"):
            error_details["status_code"] = e.status_code
        if hasattr(e, "response"):
            error_details["response"] = str(e.response)

        log.error("llm_response failed", **error_details)

        # Include detailed error in the exception message
        detailed_message = (
            f"llm_response failed: {type(e).__name__}: {e!s}"
        )
        if hasattr(e, "body"):
            detailed_message += f"\nOpenAI Error Body: {e.body}"

        raise NonRetryableError(detailed_message) from e
