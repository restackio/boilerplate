import os
from typing import Literal, Any, Dict, List, Optional

from dotenv import load_dotenv
from openai import AsyncOpenAI
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
    previous_response_id: str | None = None
    approval_response: Dict[str, Any] | None = None


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

        client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        log.info("mcp_servers", mcp_servers=function_input.mcp_servers)

        # Prepare input for the response
        input_data = []
        
        # Handle input based on whether we're continuing a conversation
        if function_input.previous_response_id:
            # For continuations, only send new input (approval response or latest message)
            if function_input.approval_response:
                input_data = [function_input.approval_response]
            elif function_input.messages:
                # Send only the latest message for continuation
                input_data = [function_input.messages[-1].model_dump()]
            else:
                input_data = []
        else:
            # For new conversations, send full input
            if function_input.messages:
                input_data.extend([msg.model_dump() for msg in function_input.messages])
            
            # Add system content if provided
            if function_input.system_content:
                input_data.append({
                    "role": "developer", 
                    "content": function_input.system_content
                })

        # Prepare the create call parameters
        create_params = {
            "model": function_input.model or "gpt-4.1",
            "input": input_data,
            "stream": True,
            "tool_choice": "auto",
        }
        
        # Always include tools if provided (needed for MCP server context even with previous_response_id)
        if function_input.mcp_servers:
            create_params["tools"] = function_input.mcp_servers
        
        # Always use store=True and add previous_response_id for conversation continuity
        if function_input.previous_response_id:
            create_params["previous_response_id"] = function_input.previous_response_id

        response = await client.responses.create(**create_params)

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
