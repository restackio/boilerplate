import os
from typing import Literal, Any, Dict, List, Optional

from dotenv import load_dotenv
from openai import OpenAI
from openai.types.responses.tool_param import Mcp

from pydantic import BaseModel
from restack_ai.function import NonRetryableError, function, log, stream_to_websocket
from src.client import api_address

load_dotenv()

class Message(BaseModel):
    role: Literal["developer", "user", "assistant"]
    content: str


class LlmResponseInput(BaseModel):
    system_content: str | None = None
    model: str | None = None
    messages: list[Message] | None = None
    mcp_servers: list[Mcp] | None = None


class LlmResponseOutput(BaseModel):
    events: List[Dict[str, Any]]
    text: str
    event_count: int
    final_response: Optional[Dict[str, Any]]
    response_id: Optional[str]
    usage: Optional[Dict[str, Any]]
    has_completion: bool


def raise_exception(message: str) -> None:
    log.error("llm_response function failed", error=message)
    raise NonRetryableError(message)




@function.defn()
async def llm_response(function_input: LlmResponseInput) -> LlmResponseOutput:
    try:
        log.info("llm_response function started", function_input=function_input)

        if os.environ.get("OPENAI_API_KEY") is None:
            raise_exception("OPENAI_API_KEY is not set")

        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        log.info("mcp_servers", mcp_servers=function_input.mcp_servers)

        if function_input.system_content:
            function_input.messages.append(
                Message(role="developer", content=function_input.system_content or "")
            )

        response = client.responses.create(
            model=function_input.model or "gpt-4.1-mini",
            input=function_input.messages,
            tools=function_input.mcp_servers,
            stream=True,
        )

        response_data = await stream_to_websocket(api_address=api_address, data=response)
        log.info("llm_response function completed", response=response_data)
        
        # Convert the response_data to our proper output model
        # Handle final_response - convert to dict if it's an object
        final_response = response_data.get("final_response")
        if final_response and hasattr(final_response, 'model_dump'):
            final_response = final_response.model_dump()
        elif final_response and hasattr(final_response, '__dict__'):
            final_response = final_response.__dict__
        
        # Handle usage - convert to dict if it's an object
        usage = response_data.get("usage")
        if usage and hasattr(usage, 'model_dump'):
            usage = usage.model_dump()
        elif usage and hasattr(usage, '__dict__'):
            usage = usage.__dict__
        
        return LlmResponseOutput(
            events=response_data.get("events", []),
            text=response_data.get("text", ""),
            event_count=response_data.get("event_count", 0),
            final_response=final_response,
            response_id=response_data.get("response_id"),
            usage=usage,
            has_completion=response_data.get("has_completion", False)
        )
    except Exception as e:
        error_message = f"llm_response failed: {e}"
        raise NonRetryableError(error_message) from e
