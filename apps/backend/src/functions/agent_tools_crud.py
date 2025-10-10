import os
import uuid
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function, log
from sqlalchemy import and_, select

from src.database.connection import get_async_db
from src.database.models import (
    AgentTool,
    McpServer,
)
from src.functions.mcp_oauth_crud import (
    GetOAuthTokenForMcpServerInput,
    get_oauth_token_for_mcp_server,
)


def _raise_mcp_server_required_error() -> None:
    """Raise error when mcp_server_id is required but missing."""
    raise NonRetryableError(
        message="mcp_server_id required for tool_type=mcp"
    )


def _raise_agent_tool_not_found_error(agent_tool_id: str) -> None:
    """Raise error when agent tool is not found."""
    raise NonRetryableError(
        message=f"Agent tool with id {agent_tool_id} not found"
    )


def _raise_tool_name_required_error() -> None:
    """Raise error when tool_name is required but missing."""
    raise NonRetryableError(
        message="tool_name is required for MCP tools"
    )


def _create_granular_require_approval(
    tools_approval: dict[str, bool],
) -> dict:
    """Create granular require_approval object for MCP tools.

    Args:
        tools_approval: Dictionary mapping tool names to their approval requirements

    Returns:
        Dictionary with "never" and "always" keys containing tool name arrays
    """
    never_tools = [
        tool
        for tool, needs_approval in tools_approval.items()
        if not needs_approval
    ]
    always_tools = [
        tool
        for tool, needs_approval in tools_approval.items()
        if needs_approval
    ]

    result = {}
    if never_tools:
        result["never"] = {"tool_names": never_tools}
    if always_tools:
        result["always"] = {"tool_names": always_tools}

    return result


class AgentToolsGetByAgentInput(BaseModel):
    agent_id: str = Field(..., min_length=1)

    user_id: str | None = Field(
        None,
        description="Optional user ID for OAuth token refresh. If not provided, uses most recent token.",
    )


class AgentToolsOutput(BaseModel):
    tools: list[dict]


class AgentToolCreateInput(BaseModel):
    agent_id: str = Field(..., min_length=1)
    tool_type: str = Field(
        ...,
        pattern=r"^(web_search|mcp|code_interpreter|image_generation|transform|load)$",
    )
    mcp_server_id: str | None = None
    # MCP-specific fields
    tool_name: str | None = None  # Required for MCP tools
    custom_description: str | None = (
        None  # Agent-specific tool description
    )
    require_approval: bool = False  # Tool approval setting
    # General fields
    config: dict | None = None
    allowed_tools: list[str] | None = None
    execution_order: int | None = None
    enabled: bool | None = True


class AgentToolUpdateInput(BaseModel):
    agent_tool_id: str = Field(..., min_length=1)
    tool_type: str | None = Field(
        None,
        pattern=r"^(web_search|mcp|code_interpreter|image_generation)$",
    )
    mcp_server_id: str | None = None
    # MCP-specific fields
    tool_name: str | None = None
    custom_description: str | None = None
    require_approval: bool | None = None
    # General fields
    config: dict | None = None
    allowed_tools: list[str] | None = None
    execution_order: int | None = None
    enabled: bool | None = None


class AgentToolIdInput(BaseModel):
    agent_tool_id: str = Field(..., min_length=1)


class AgentToolOutput(BaseModel):
    id: str
    agent_id: str
    tool_type: str
    mcp_server_id: str | None = None
    # MCP-specific fields
    tool_name: str | None = None
    custom_description: str | None = None
    require_approval: bool | None = None
    # General fields
    config: dict | None = None
    allowed_tools: list[str] | None = None
    execution_order: int | None = None
    enabled: bool | None = True
    created_at: str | None = None
    # convenience
    mcp_server_label: str | None = None

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class AgentToolSingleOutput(BaseModel):
    agent_tool: AgentToolOutput


class AgentToolListOutput(BaseModel):
    agent_tools: list[AgentToolOutput]


class AgentToolDeleteOutput(BaseModel):
    success: bool


# MCP-specific models (merged from agent_mcp_tools_crud.py)
class AgentMcpToolCreateInput(BaseModel):
    """Input for creating an agent MCP tool."""

    agent_id: str = Field(..., min_length=1)
    mcp_server_id: str = Field(..., min_length=1)
    tool_name: str = Field(..., min_length=1)
    custom_description: str | None = None
    require_approval: bool = False
    enabled: bool = True


class AgentMcpToolUpdateInput(BaseModel):
    """Input for updating an agent MCP tool."""

    id: str = Field(..., min_length=1)
    custom_description: str | None = None
    require_approval: bool | None = None
    enabled: bool | None = None


class AgentMcpToolDeleteInput(BaseModel):
    """Input for deleting an agent MCP tool."""

    id: str = Field(..., min_length=1)


class AgentMcpToolsByAgentInput(BaseModel):
    """Input for getting agent MCP tools by agent ID."""

    agent_id: str = Field(..., min_length=1)


class AgentMcpToolListInput(BaseModel):
    """Input for listing available tools from an MCP server."""

    agent_id: str = Field(..., min_length=1)
    mcp_server_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)


class AgentMcpToolData(BaseModel):
    """Agent MCP tool data."""

    id: str
    agent_id: str
    mcp_server_id: str
    tool_name: str
    custom_description: str | None
    require_approval: bool
    enabled: bool
    created_at: str
    updated_at: str
    # Server info
    server_label: str
    server_description: str | None


class AgentMcpToolSingleOutput(BaseModel):
    """Output for single agent MCP tool operations."""

    success: bool
    data: AgentMcpToolData | None = None
    error: str | None = None


class AgentMcpToolListOutput(BaseModel):
    """Output for agent MCP tool list operations."""

    success: bool
    data: list[AgentMcpToolData] = Field(default_factory=list)
    error: str | None = None


class ListedTool(BaseModel):
    """A tool listed from an MCP server."""

    name: str
    description: str | None = None
    already_added: bool = False


class AgentMcpToolAvailableListOutput(BaseModel):
    """Output for tool list operations."""

    success: bool
    tools: list[ListedTool] = Field(default_factory=list)
    error: str | None = None


async def _load_mcp_servers(
    db: Any, mcp_ids: list
) -> dict[str, McpServer]:
    """Load MCP servers by IDs and return as a map."""
    if not mcp_ids:
        return {}

    mq = select(McpServer).where(McpServer.id.in_(mcp_ids))
    mres = await db.execute(mq)
    return {str(ms.id): ms for ms in mres.scalars().all()}


def _get_mcp_server_url(mcp_server: McpServer) -> str:
    """Get the appropriate URL for an MCP server."""
    if getattr(mcp_server, "local", False):
        return os.getenv("RESTACK_ENGINE_MCP_ADDRESS")
    return mcp_server.server_url


def _init_mcp_server_config(mcp_server: McpServer) -> dict:
    """Initialize configuration for an MCP server."""
    return {
        "type": "mcp",
        "server_label": mcp_server.server_label,
        "server_url": _get_mcp_server_url(mcp_server),
        "server_description": mcp_server.server_description or "",
        "headers": mcp_server.headers or {},
        "allowed_tools": [],
        "tools_approval": {},
        "mcp_server": mcp_server,
    }


def _add_tool_to_server_config(
    server_config: dict, tool_name: str, *, require_approval: bool
) -> None:
    """Add a tool to server configuration with approval settings."""
    if tool_name not in server_config["allowed_tools"]:
        server_config["allowed_tools"].append(tool_name)
    server_config["tools_approval"][tool_name] = (
        require_approval or False
    )


def _group_mcp_tools_by_server(
    rows: list, mcp_map: dict[str, McpServer]
) -> dict[str, dict]:
    """Group MCP tools by their server."""
    mcp_servers_config: dict[str, dict] = {}

    for r in rows:
        if r.tool_type != "mcp" or not r.mcp_server_id:
            continue

        ms = mcp_map.get(str(r.mcp_server_id))
        if not ms:
            continue

        server_key = str(r.mcp_server_id)

        if server_key not in mcp_servers_config:
            mcp_servers_config[server_key] = (
                _init_mcp_server_config(ms)
            )

        # Add tool(s) to this server's configuration
        if r.tool_name:
            _add_tool_to_server_config(
                mcp_servers_config[server_key],
                r.tool_name,
                require_approval=r.require_approval,
            )
        elif r.allowed_tools:
            for tool_name in r.allowed_tools:
                _add_tool_to_server_config(
                    mcp_servers_config[server_key],
                    tool_name,
                    require_approval=r.require_approval,
                )

    return mcp_servers_config


async def _create_mcp_tool_configs(
    mcp_servers_config: dict,
    user_id: str | None,
) -> list[dict]:
    """Create final tool configurations with OAuth for MCP servers."""
    tools = []

    for server_config in mcp_servers_config.values():
        ms = server_config["mcp_server"]

        # Get OAuth token for this server
        oauth_token = await get_oauth_token_for_mcp_server(
            GetOAuthTokenForMcpServerInput(
                mcp_server_id=str(ms.id),
                user_id=user_id,
            )
        )

        tool_obj = {
            "type": server_config["type"],
            "server_label": server_config["server_label"],
            "server_url": server_config["server_url"],
            "server_description": server_config[
                "server_description"
            ],
            "headers": server_config["headers"],
            "allowed_tools": server_config["allowed_tools"],
            "require_approval": _create_granular_require_approval(
                server_config["tools_approval"]
            ),
        }

        if oauth_token:
            tool_obj["authorization"] = oauth_token
            user_context = (
                f"user {user_id}"
                if user_id
                else "most recent token"
            )
            log.info(
                f"Added OAuth authorization for MCP server {ms.server_label} using {user_context}"
            )
        elif ms.server_url and (
            "oauth" in (ms.server_url or "").lower()
            or "api." in (ms.server_url or "").lower()
        ):
            log.info(
                f"No OAuth token found for MCP server {ms.server_label} - may need authentication"
            )

        tools.append(tool_obj)

    return tools


def _add_non_mcp_tools(rows: list, tools: list[dict]) -> None:
    """Add non-MCP tools (OpenAI official tools) to the tools list."""
    for r in rows:
        if r.tool_type != "mcp":
            tool_obj = {"type": r.tool_type}
            if r.config:
                tool_obj.update(r.config)
            tools.append(tool_obj)


@function.defn()
async def agent_tools_read_by_agent(
    function_input: AgentToolsGetByAgentInput,
) -> AgentToolsOutput:
    """Read agent tools formatted for workflow consumption."""
    async for db in get_async_db():
        try:
            # Fetch agent tools from database
            agent_uuid = uuid.UUID(function_input.agent_id)
            q = select(AgentTool).where(
                AgentTool.agent_id == agent_uuid
            )
            res = await db.execute(q)
            rows = res.scalars().all()

            # Preload MCP servers for efficiency
            mcp_ids = [
                r.mcp_server_id
                for r in rows
                if r.tool_type == "mcp" and r.mcp_server_id
            ]
            mcp_map = await _load_mcp_servers(db, mcp_ids)

            # Group MCP tools by server with approval settings
            mcp_servers_config = _group_mcp_tools_by_server(
                rows, mcp_map
            )

            # Create MCP tool configurations with OAuth
            tools = await _create_mcp_tool_configs(
                mcp_servers_config,
                function_input.user_id,
            )

            # Add non-MCP tools (OpenAI official tools)
            _add_non_mcp_tools(rows, tools)

            return AgentToolsOutput(tools=tools)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to read agent tools: {e!s}"
            ) from e
    return None  # pragma: no cover


@function.defn()
async def agent_tools_read_records_by_agent(
    function_input: AgentToolsGetByAgentInput,
) -> AgentToolListOutput:
    """Read agent tools as structured records for UI consumption."""
    async for db in get_async_db():
        try:
            agent_uuid = uuid.UUID(function_input.agent_id)
            q = select(AgentTool).where(
                AgentTool.agent_id == agent_uuid
            )
            res = await db.execute(q)
            rows = res.scalars().all()

            # Enrich with MCP server info
            mcp_ids = [
                r.mcp_server_id for r in rows if r.mcp_server_id
            ]
            mcp_map: dict[str, McpServer] = {}
            if mcp_ids:
                mq = select(McpServer).where(
                    McpServer.id.in_(mcp_ids)
                )
                mres = await db.execute(mq)
                for ms in mres.scalars().all():
                    mcp_map[str(ms.id)] = ms

            outputs = [
                AgentToolOutput(
                    id=str(r.id),
                    agent_id=str(r.agent_id),
                    tool_type=r.tool_type,
                    mcp_server_id=str(r.mcp_server_id)
                    if r.mcp_server_id
                    else None,
                    # MCP-specific fields
                    tool_name=r.tool_name,
                    custom_description=r.custom_description,
                    require_approval=r.require_approval,
                    # General fields
                    config=r.config,
                    allowed_tools=r.allowed_tools,
                    execution_order=r.execution_order,
                    enabled=bool(r.enabled)
                    if r.enabled is not None
                    else True,
                    created_at=r.created_at.isoformat()
                    if getattr(r, "created_at", None)
                    else None,
                    mcp_server_label=mcp_map.get(
                        str(r.mcp_server_id)
                    ).server_label
                    if r.mcp_server_id
                    and mcp_map.get(str(r.mcp_server_id))
                    else None,
                )
                for r in rows
            ]

            return AgentToolListOutput(agent_tools=outputs)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to read agent tools records: {e!s}"
            ) from e
    return None  # pragma: no cover


@function.defn()
async def agent_tools_create(
    function_input: AgentToolCreateInput,
) -> AgentToolSingleOutput:
    """Create a new agent tool (MCP or OpenAI official tool)."""
    async for db in get_async_db():
        try:
            # Basic validations per tool type
            if (
                function_input.tool_type == "mcp"
                and not function_input.mcp_server_id
            ):
                _raise_mcp_server_required_error()

            # For MCP tools, tool_name is required
            if (
                function_input.tool_type == "mcp"
                and not function_input.tool_name
            ):
                _raise_tool_name_required_error()

            agent_uuid = uuid.UUID(function_input.agent_id)
            mcp_uuid = (
                uuid.UUID(function_input.mcp_server_id)
                if function_input.mcp_server_id
                else None
            )

            # Check for existing record if it's an MCP tool
            existing_record = None
            if (
                function_input.tool_type == "mcp"
                and mcp_uuid
                and function_input.tool_name
            ):
                existing_query = select(AgentTool).where(
                    and_(
                        AgentTool.agent_id == agent_uuid,
                        AgentTool.tool_type == "mcp",
                        AgentTool.mcp_server_id == mcp_uuid,
                        AgentTool.tool_name
                        == function_input.tool_name,
                    )
                )
                existing_result = await db.execute(existing_query)
                existing_record = (
                    existing_result.scalar_one_or_none()
                )

            if existing_record:
                # Update existing record
                existing_record.config = function_input.config
                existing_record.allowed_tools = (
                    function_input.allowed_tools
                )
                existing_record.execution_order = (
                    function_input.execution_order
                )
                existing_record.enabled = (
                    function_input.enabled
                    if function_input.enabled is not None
                    else True
                )
                # Update MCP-specific fields
                existing_record.tool_name = (
                    function_input.tool_name
                )
                existing_record.custom_description = (
                    function_input.custom_description
                )
                existing_record.require_approval = (
                    function_input.require_approval
                )
                record = existing_record
            else:
                # Create new tool record
                record = AgentTool(
                    id=uuid.uuid4(),
                    agent_id=agent_uuid,
                    tool_type=function_input.tool_type,
                    mcp_server_id=mcp_uuid,
                    # MCP-specific fields
                    tool_name=function_input.tool_name,
                    custom_description=function_input.custom_description,
                    require_approval=function_input.require_approval,
                    # General fields
                    config=function_input.config,
                    allowed_tools=function_input.allowed_tools,
                    execution_order=function_input.execution_order,
                    enabled=(
                        function_input.enabled
                        if function_input.enabled is not None
                        else True
                    ),
                )
                db.add(record)
            await db.commit()
            await db.refresh(record)

            # Enrich with MCP server info
            mcp_label = None
            if record.mcp_server_id:
                mq = select(McpServer).where(
                    McpServer.id == record.mcp_server_id
                )
                mres = await db.execute(mq)
                m = mres.scalar_one_or_none()
                if m:
                    mcp_label = m.server_label

            return AgentToolSingleOutput(
                agent_tool=AgentToolOutput(
                    id=str(record.id),
                    agent_id=str(record.agent_id),
                    tool_type=record.tool_type,
                    mcp_server_id=str(record.mcp_server_id)
                    if record.mcp_server_id
                    else None,
                    config=record.config,
                    allowed_tools=record.allowed_tools,
                    execution_order=record.execution_order,
                    enabled=bool(record.enabled)
                    if record.enabled is not None
                    else True,
                    created_at=record.created_at.isoformat()
                    if getattr(record, "created_at", None)
                    else None,
                    mcp_server_label=mcp_label,
                )
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to create agent tool: {e!s}"
            ) from e
    return None  # pragma: no cover


@function.defn()
async def agent_tools_update(
    function_input: AgentToolUpdateInput,
) -> AgentToolSingleOutput:
    """Update an existing agent tool."""
    async for db in get_async_db():
        try:
            q = select(AgentTool).where(
                AgentTool.id
                == uuid.UUID(function_input.agent_tool_id)
            )
            res = await db.execute(q)
            record = res.scalar_one_or_none()
            if not record:
                _raise_agent_tool_not_found_error(
                    function_input.agent_tool_id
                )

            update_data = function_input.dict(
                exclude_unset=True, exclude={"agent_tool_id"}
            )
            if "mcp_server_id" in update_data:
                update_data["mcp_server_id"] = (
                    uuid.UUID(update_data["mcp_server_id"])
                    if update_data["mcp_server_id"]
                    else None
                )

            for key, value in update_data.items():
                if hasattr(record, key):
                    setattr(record, key, value)

            await db.commit()
            await db.refresh(record)

            # Enrich with MCP server info
            mcp_label = None
            if record.mcp_server_id:
                mq = select(McpServer).where(
                    McpServer.id == record.mcp_server_id
                )
                mres = await db.execute(mq)
                m = mres.scalar_one_or_none()
                if m:
                    mcp_label = m.server_label

            return AgentToolSingleOutput(
                agent_tool=AgentToolOutput(
                    id=str(record.id),
                    agent_id=str(record.agent_id),
                    tool_type=record.tool_type,
                    mcp_server_id=str(record.mcp_server_id)
                    if record.mcp_server_id
                    else None,
                    config=record.config,
                    allowed_tools=record.allowed_tools,
                    execution_order=record.execution_order,
                    enabled=bool(record.enabled)
                    if record.enabled is not None
                    else True,
                    created_at=record.created_at.isoformat()
                    if getattr(record, "created_at", None)
                    else None,
                    mcp_server_label=mcp_label,
                )
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to update agent tool: {e!s}"
            ) from e
    return None  # pragma: no cover


@function.defn()
async def agent_tools_delete(
    function_input: AgentToolIdInput,
) -> AgentToolDeleteOutput:
    """Delete an agent tool."""
    async for db in get_async_db():
        try:
            q = select(AgentTool).where(
                AgentTool.id
                == uuid.UUID(function_input.agent_tool_id)
            )
            res = await db.execute(q)
            record = res.scalar_one_or_none()
            if not record:
                # Tool already deleted or doesn't exist - return success (idempotent)
                return AgentToolDeleteOutput(success=True)
            await db.delete(record)
            await db.commit()
            return AgentToolDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete agent tool: {e!s}"
            ) from e
    return None  # pragma: no cover
