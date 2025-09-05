from pydantic import BaseModel
from restack_ai.function import function

from .llm_response_stream import LlmResponseInput, Message


class LlmPrepareResponseInput(BaseModel):
    messages: list[Message] | None = None
    tools: list[dict] | None = None
    model: str | None = None
    reasoning_effort: str | None = None
    previous_response_id: str | None = None
    approval_response: dict | None = None


@function.defn()
async def llm_prepare_response(
    function_input: LlmPrepareResponseInput,
) -> LlmResponseInput:
    """Simple OpenAI API parameter preparation."""
    # Prepare input
    input_data = []
    if function_input.messages:
        input_data = [
            {"role": msg.role, "content": msg.content}
            for msg in function_input.messages
        ]

    # Create OpenAI parameters
    create_params = {
        "model": function_input.model or "gpt-5",
        "input": input_data,
        "tool_choice": "auto",
        "reasoning": {
            "effort": function_input.reasoning_effort
            or "minimal",
            "summary": "detailed",
        },
        "text": {"format": {"type": "text"}, "verbosity": "low"},
        "parallel_tool_calls": True,
        "stream": True,
    }

    # Add optional parameters
    if function_input.previous_response_id:
        create_params["previous_response_id"] = (
            function_input.previous_response_id
        )
    if function_input.tools:
        create_params["tools"] = function_input.tools
    if function_input.approval_response:
        # Add approval response as input instead of replacing the messages
        create_params["input"] = [
            function_input.approval_response
        ]

    return LlmResponseInput(create_params=create_params)
