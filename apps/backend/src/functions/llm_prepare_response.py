from typing import Any, Literal, cast

from openai.types.responses import (
    FileSearchToolParam,
    WebSearchToolParam,
)
from openai.types.responses.tool_param import (
    FunctionToolParam,
    Mcp,
)
from pydantic import BaseModel
from restack_ai.function import (
    NonRetryableError,
    function,
    log,
)

from .openai_sdk_types import Message, LlmResponseInput, ToolParam


class LlmPrepareResponseInput(BaseModel):
    system_content: str | None = None
    model: str | None = None
    messages: list[Message] | None = None
    mcp_servers: list[Mcp] | None = None
    # Use the ToolParam union type for cleaner typing
    tools: list[ToolParam] | None = None
    previous_response_id: str | None = None
    # Reasoning/text controls
    reasoning_effort: Literal["minimal", "low", "medium", "high"] | None = None
    verbosity: Literal["low", "medium", "high"] | None = None
    # Additional controls referenced in implementation
    response_format: str | dict[str, Any] | None = None
    parallel_tool_calls: bool | None = None
    # Approval continuation payload (for paused responses)
    approval_response: dict[str, Any] | None = None
    # Agent information for event extraction
    agent_id: str | None = None

@function.defn()
async def llm_prepare_response(  # noqa: C901, PLR0912, PLR0915
    function_input: LlmPrepareResponseInput,
) -> LlmResponseInput:
    try:
        log.info("llm_prepare_response started", agent_id=function_input.agent_id, model=function_input.model)

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
                input_data.append(
                    {
                        "role": "developer",
                        "content": function_input.system_content,
                    }
                )

        # Prepare the create call parameters with new GPT-5 default and explicit defaults for debuggability
        # Normalize response_format to dict form expected by OpenAI Responses API
        # Allowed simple types include: {"type": "text"} or {"type": "json_object"}
        # For json_schema callers should supply the full dict; we pass it through.
        if isinstance(function_input.response_format, dict):
            format_obj: dict[str, Any] = function_input.response_format
        else:
            rf = (function_input.response_format or "text").strip()
            if rf not in ("text", "json_object"):
                rf = "text"
            format_obj = {"type": rf}

        # Build create_params as a regular dict first, then cast to ResponseCreateParams
        create_params_dict = {
            "model": function_input.model or "gpt-5",
            "input": input_data,
            "tool_choice": "auto",
            "reasoning": {"effort": function_input.reasoning_effort or "minimal", "summary": "detailed"},
            "previous_response_id": function_input.previous_response_id,
            "text": {
                "format": format_obj,
                "verbosity": function_input.verbosity or "low",
            },
            "parallel_tool_calls": function_input.parallel_tool_calls or True,
            "stream": True,
        }



        # Include tools per Responses API (unified array). Prefer typed params and normalize legacy dicts.
        def _normalize_tool(raw_tool: ToolParam) -> ToolParam:
            # Already a typed tool param instance
            if not isinstance(raw_tool, dict):
                return raw_tool

            # Dict input from DB/UI - attempt typed validation by "type"
            tool_dict = cast(dict[str, Any], raw_tool)
            tool_type = tool_dict.get("type")



            if tool_type == "mcp":
                # Let SDK validate MCP shape if possible, otherwise pass-through
                try:
                    return Mcp.model_validate(tool_dict)
                except Exception:  # noqa: BLE001
                    return tool_dict

            if tool_type == "web_search_preview":
                try:
                    return WebSearchToolParam.model_validate(tool_dict)
                except Exception:  # noqa: BLE001
                    return tool_dict

            if tool_type == "file_search":
                try:
                    return FileSearchToolParam.model_validate(tool_dict)
                except Exception:  # noqa: BLE001
                    return tool_dict

            # Unknown tool type: pass through as-is; the API may reject, but we won't block
            return tool_dict

        if function_input.tools:
            normalized_tools: list[ToolParam] = []
            for tool in function_input.tools:
                try:
                    normalized_tools.append(_normalize_tool(tool))
                except Exception as e:  # noqa: BLE001
                    # Skip malformed tools to avoid API 400s
                    log.warning(f"Skipping malformed tool: {tool}, error: {e}")
                    continue
            if normalized_tools:
                create_params_dict["tools"] = normalized_tools
        elif function_input.mcp_servers:
            # Backward compatibility: allow separate MCP servers list
            create_params_dict["tools"] = function_input.mcp_servers

        # Use the dict directly instead of casting to ResponseCreateParams
        # The cast was potentially stripping out the tools field
        create_params = create_params_dict

        log.info("llm_prepare_response completed", create_params=create_params)
        return LlmResponseInput(
            create_params=create_params,
            agent_id=function_input.agent_id
        )
    except Exception as e:
        error_message = f"llm_prepare_response failed: {e}"
        raise NonRetryableError(error_message) from e
