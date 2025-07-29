import os
from typing import Literal

from dotenv import load_dotenv
from openai import OpenAI
from openai.types.chat.chat_completion import ChatCompletion
from openai.types.chat.chat_completion_message_tool_call import (
    ChatCompletionMessageToolCall,
)
from openai.types.chat.chat_completion_tool_param import (
    ChatCompletionToolParam,
)
from pydantic import BaseModel
from restack_ai.function import NonRetryableError, function, log

load_dotenv()

class Message(BaseModel):
    role: Literal["developer", "user", "assistant", "tool"]
    content: str
    tool_call_id: str | None = None
    tool_calls: list[ChatCompletionMessageToolCall] | None = None


class LlmResponseInput(BaseModel):
    system_content: str | None = None
    model: str | None = None
    messages: list[Message] | None = None
    tools: list[ChatCompletionToolParam] | None = None


def raise_exception(message: str) -> None:
    log.error("llm_response function failed", error=message)
    raise NonRetryableError(message)




@function.defn()
async def llm_response(function_input: LlmResponseInput) -> ChatCompletion:
    try:
        log.info("llm_response function started", function_input=function_input)

        if os.environ.get("OPENAI_API_KEY") is None:
            raise_exception("OPENAI_API_KEY is not set")

        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        log.info("pydantic_function_tool", tools=function_input.tools)

        if function_input.system_content:
            function_input.messages.append(
                Message(role="developer", content=function_input.system_content or "")
            )

        response = client.responses.create(
            model=function_input.model or "gpt-4.1-mini",
            input=function_input.messages,
            tools=[
                {
                    "type": "mcp",
                    "server_label": "deepwiki",
                    "server_url": "https://mcp.deepwiki.com/mcp",
                    "require_approval": "never",
                },
            ],
        )
    except Exception as e:
        error_message = f"llm_response failed: {e}"
        raise NonRetryableError(error_message) from e
    else:
        log.info("llm_response function completed", response=response)
        return response.model_dump()