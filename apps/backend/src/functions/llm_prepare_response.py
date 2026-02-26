import os

from pydantic import BaseModel
from restack_ai.function import function

from .llm_response_stream import LlmResponseInput, Message

# Server-side compaction: when context exceeds this many tokens, OpenAI compacts
# and emits a compaction item in the stream. Use 0 or unset to disable.
# See https://developers.openai.com/api/docs/guides/compaction#server-side-compaction
COMPACT_THRESHOLD_ENV = "OPENAI_COMPACT_THRESHOLD"
DEFAULT_COMPACT_THRESHOLD = 200_000  # tokens (e.g. ~150k context before compacting)


def _get_compact_threshold() -> int | None:
    raw = os.environ.get(COMPACT_THRESHOLD_ENV)
    if raw is None or raw == "":
        return DEFAULT_COMPACT_THRESHOLD
    try:
        n = int(raw)
    except ValueError:
        return None
    else:
        return n if n > 0 else None


class LlmPrepareResponseInput(BaseModel):
    messages: list[Message] | None = None
    tools: list[dict] | None = None
    model: str | None = None
    reasoning_effort: str | None = None
    previous_response_id: str | None = None
    approval_response: dict | None = None
    task_id: str | None = None
    agent_id: str | None = None
    workspace_id: str | None = None


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
        "model": function_input.model or "gpt-5.2",
        "input": input_data,
        "tool_choice": "auto",
        "reasoning": {
            "effort": function_input.reasoning_effort
            or "minimal",
            "summary": "detailed",
        },
        "text": {
            "format": {"type": "text"},
            "verbosity": "medium",
        },
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

    # Server-side compaction for long conversations (preserves context, reduces tokens)
    compact_threshold = _get_compact_threshold()
    if compact_threshold is not None:
        create_params["context_management"] = [
            {"type": "compaction", "compact_threshold": compact_threshold}
        ]

    return LlmResponseInput(
        create_params=create_params,
        task_id=function_input.task_id,
        agent_id=function_input.agent_id,
        workspace_id=function_input.workspace_id,
    )
