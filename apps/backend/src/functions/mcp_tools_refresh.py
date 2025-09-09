import json
import os

import aiohttp
from pydantic import BaseModel, Field
from restack_ai.function import function


class McpToolsListInput(BaseModel):
    server_url: str = Field(..., min_length=1)
    headers: dict[str, str] | None = None
    local: bool = Field(default=False)


class McpToolsListOutput(BaseModel):
    success: bool
    tools_list: list[str] = Field(default_factory=list)
    error: str | None = None


class McpSessionInitInput(BaseModel):
    server_url: str = Field(..., min_length=1)
    headers: dict[str, str] | None = None
    local: bool = Field(default=False)


class McpSessionInitOutput(BaseModel):
    success: bool
    session_id: str | None = None
    mcp_endpoint: str | None = None
    error: str | None = None


class McpToolsSessionInput(BaseModel):
    mcp_endpoint: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    headers: dict[str, str] | None = None


class McpToolsSessionOutput(BaseModel):
    success: bool
    tools: list[str] = Field(default_factory=list)
    error: str | None = None


class McpToolsListDirectInput(BaseModel):
    server_url: str = Field(..., min_length=1)
    headers: dict[str, str] | None = None
    local: bool = Field(default=False)


class McpToolsListDirectOutput(BaseModel):
    success: bool
    tools: list[str] = Field(default_factory=list)
    error: str | None = None


@function.defn()
async def mcp_session_init(
    function_input: McpSessionInitInput,
) -> McpSessionInitOutput:
    """Initialize an MCP session and return session ID and endpoint."""
    try:
        # Get the effective server URL (use MCP_URL for local servers)
        effective_url = _get_effective_server_url(
            function_input.server_url, local=function_input.local
        )

        async with aiohttp.ClientSession() as session:
            request_headers = function_input.headers or {}
            request_headers.setdefault(
                "Content-Type", "application/json"
            )
            request_headers.setdefault(
                "Accept", "application/json, text/event-stream"
            )
            request_headers.setdefault(
                "MCP-Protocol-Version", "2025-03-26"
            )

            # Initialize MCP session
            init_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {"tools": {}},
                    "clientInfo": {
                        "name": "MCP-Tools-List",
                        "version": "1.0.0",
                    },
                },
            }

            async with session.post(
                effective_url,
                json=init_payload,
                headers=request_headers,
                timeout=10,
            ) as init_response:
                if init_response.status == 200:  # noqa: PLR2004
                    # Check for session ID in headers first
                    session_id = init_response.headers.get(
                        "Mcp-Session-Id"
                    )

                    # Parse response based on content type
                    content_type = init_response.headers.get(
                        "content-type", ""
                    )

                    if "text/event-stream" in content_type:
                        # Parse SSE format - read line by line to avoid timeout
                        current_data = ""
                        async for line in init_response.content:
                            line_text = line.decode(
                                "utf-8"
                            ).strip()
                            if line_text.startswith("data: "):
                                current_data += line_text[
                                    6:
                                ]  # Remove "data: " prefix
                            elif line_text == "" and current_data:
                                # End of event, try to parse JSON
                                try:
                                    init_data = json.loads(
                                        current_data
                                    )
                                    if (
                                        isinstance(
                                            init_data, dict
                                        )
                                        and "result" in init_data
                                    ):
                                        return McpSessionInitOutput(
                                            success=True,
                                            session_id=session_id,
                                            mcp_endpoint=effective_url,
                                        )
                                    current_data = (
                                        ""  # Reset for next event
                                    )
                                except json.JSONDecodeError:
                                    current_data = (
                                        ""  # Reset on parse error
                                    )
                                    continue
                                # Stop after first successful message
                                break
                    else:
                        # Regular JSON response
                        init_data = await init_response.json()
                        if (
                            isinstance(init_data, dict)
                            and "result" in init_data
                        ):
                            return McpSessionInitOutput(
                                success=True,
                                session_id=session_id,
                                mcp_endpoint=effective_url,
                            )

            return McpSessionInitOutput(
                success=False,
                error="Failed to initialize MCP session - no valid endpoint found",
            )

    except Exception as e:  # noqa: BLE001
        return McpSessionInitOutput(
            success=False,
            error=f"Error initializing MCP session: {e!s}",
        )


def _get_effective_server_url(server_url: str, *, local: bool) -> str:
    """Get the effective server URL, using MCP_URL environment variable for local servers."""
    if local:
        return os.getenv("MCP_URL", server_url)
    return server_url


def _prepare_mcp_headers(
    headers: dict[str, str] | None, session_id: str
) -> dict[str, str]:
    """Prepare headers for MCP requests."""
    request_headers = headers or {}
    request_headers.setdefault("Content-Type", "application/json")
    request_headers.setdefault(
        "Accept", "application/json, text/event-stream"
    )
    request_headers.setdefault(
        "MCP-Protocol-Version", "2025-03-26"
    )
    request_headers["Mcp-Session-Id"] = session_id
    return request_headers


def _extract_tool_names_from_result(result: dict) -> list[str]:
    """Extract tool names from MCP result data."""
    if "tools" in result and isinstance(result["tools"], list):
        return [
            tool.get("name", "")
            for tool in result["tools"]
            if tool.get("name")
        ]
    return []


async def _parse_sse_response(
    response_content: aiohttp.StreamReader,
) -> McpToolsListOutput | None:
    """Parse Server-Sent Events response for tools data."""
    current_data = ""
    async for line in response_content:
        line_text = line.decode("utf-8").strip()
        if line_text.startswith("data: "):
            current_data += line_text[
                6:
            ]  # Remove "data: " prefix
        elif line_text == "" and current_data:
            # End of event, try to parse JSON
            try:
                tools_data = json.loads(current_data)
                if (
                    isinstance(tools_data, dict)
                    and "result" in tools_data
                ):
                    result = tools_data["result"]
                    tool_names = _extract_tool_names_from_result(
                        result
                    )
                    if tool_names:
                        return McpToolsSessionOutput(
                            success=True, tools=tool_names
                        )
                current_data = ""  # Reset for next event
            except json.JSONDecodeError:
                current_data = ""  # Reset on parse error
                continue
            # Stop after first successful message
            break
    return None


@function.defn()
async def mcp_tools_list(
    function_input: McpToolsSessionInput,
) -> McpToolsSessionOutput:
    """Get tools list from an MCP server with an active session."""
    try:
        async with aiohttp.ClientSession() as session:
            request_headers = _prepare_mcp_headers(
                function_input.headers, function_input.session_id
            )

            tools_payload = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list",
                "params": {},
            }

            async with session.post(
                function_input.mcp_endpoint,
                json=tools_payload,
                headers=request_headers,
                timeout=10,
            ) as tools_response:
                if tools_response.status == 200:  # noqa: PLR2004
                    content_type = tools_response.headers.get(
                        "content-type", ""
                    )

                    if "text/event-stream" in content_type:
                        # Parse SSE format
                        sse_result = await _parse_sse_response(
                            tools_response.content
                        )
                        if sse_result:
                            return sse_result
                    else:
                        # Regular JSON response
                        tools_data = await tools_response.json()
                        if (
                            isinstance(tools_data, dict)
                            and "result" in tools_data
                        ):
                            result = tools_data["result"]
                            tool_names = (
                                _extract_tool_names_from_result(
                                    result
                                )
                            )
                            if tool_names:
                                return McpToolsSessionOutput(
                                    success=True, tools=tool_names
                                )

                return McpToolsSessionOutput(
                    success=False,
                    error=f"Failed to get tools list: HTTP {tools_response.status}",
                )

    except Exception as e:  # noqa: BLE001
        return McpToolsSessionOutput(
            success=False,
            error=f"Error getting tools list: {e!s}",
        )


@function.defn()
async def mcp_tools_list_direct(
    function_input: McpToolsListDirectInput,
) -> McpToolsListDirectOutput:
    """Get tools list from an MCP server without session management (for servers that don't require sessions)."""
    try:
        # Get the effective server URL (use MCP_URL for local servers)
        effective_url = _get_effective_server_url(
            function_input.server_url, local=function_input.local
        )

        async with aiohttp.ClientSession() as session:
            request_headers = function_input.headers or {}
            request_headers.setdefault(
                "Content-Type", "application/json"
            )
            request_headers.setdefault(
                "Accept", "application/json, text/event-stream"
            )
            request_headers.setdefault(
                "MCP-Protocol-Version", "2025-03-26"
            )

            tools_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/list",
                "params": {},
            }

            async with session.post(
                effective_url,
                json=tools_payload,
                headers=request_headers,
                timeout=10,
            ) as tools_response:
                if tools_response.status == 200:  # noqa: PLR2004
                    # Parse response based on content type
                    content_type = tools_response.headers.get(
                        "content-type", ""
                    )

                    if "text/event-stream" in content_type:
                        # Parse SSE format - read line by line to avoid timeout
                        current_data = ""
                        async for line in tools_response.content:
                            line_text = line.decode(
                                "utf-8"
                            ).strip()
                            if line_text.startswith("data: "):
                                current_data += line_text[
                                    6:
                                ]  # Remove "data: " prefix
                            elif line_text == "" and current_data:
                                # End of event, try to parse JSON
                                try:
                                    tools_data = json.loads(
                                        current_data
                                    )
                                    if (
                                        isinstance(
                                            tools_data, dict
                                        )
                                        and "result" in tools_data
                                    ):
                                        tools_info = tools_data[
                                            "result"
                                        ].get("tools", [])
                                        tool_names = [
                                            tool.get("name", "")
                                            for tool in tools_info
                                            if "name" in tool
                                        ]
                                        return McpToolsListDirectOutput(
                                            success=True,
                                            tools=tool_names,
                                        )
                                    current_data = (
                                        ""  # Reset for next event
                                    )
                                except json.JSONDecodeError:
                                    current_data = (
                                        ""  # Reset on parse error
                                    )
                                    continue
                                # Stop after first successful message
                                break
                    else:
                        # Regular JSON response
                        tools_data = await tools_response.json()
                        if (
                            isinstance(tools_data, dict)
                            and "result" in tools_data
                        ):
                            tools_info = tools_data["result"].get(
                                "tools", []
                            )
                            tool_names = [
                                tool.get("name", "")
                                for tool in tools_info
                                if "name" in tool
                            ]
                            return McpToolsListDirectOutput(
                                success=True, tools=tool_names
                            )

                return McpToolsListDirectOutput(
                    success=False,
                    error=f"Failed to get tools list: HTTP {tools_response.status}",
                )

    except Exception as e:  # noqa: BLE001
        return McpToolsListDirectOutput(
            success=False,
            error=f"Error getting tools list: {e!s}",
        )
