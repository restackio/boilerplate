import os
import uuid

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function, log
from sqlalchemy import select, and_

from src.database.connection import get_async_db
from src.database.models import (
    AgentTool,
    McpServer,
)
from src.functions.mcp_oauth_crud import (
    get_oauth_token_for_mcp_server,
    GetOAuthTokenForMcpServerInput,
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


def _convert_approval_config(
    require_approval: dict,
    allowed_tools: list[str],
    *,
    convert_to_string: bool = True,
) -> str | dict:
    """Convert our internal approval configuration to OpenAI's expected string format.

    Args:
        require_approval: Our internal config like {"never": {"tool_names": ["tool1"]}, "always": {"tool_names": []}}
        allowed_tools: List of tools allowed for this agent
        convert_to_string: If True, converts to string format; if False, returns original object format

    Returns:
        String format ("never", "always") if convert_to_string=True,
        or original object format if convert_to_string=False
    """
    if not convert_to_string:
        # Return original object format for testing/debugging
        return require_approval or {}
    if not require_approval:
        return "never"

    never_tools = require_approval.get("never", {}).get(
        "tool_names", []
    )
    always_tools = require_approval.get("always", {}).get(
        "tool_names", []
    )

    # If no allowed_tools specified, check all tools in the config
    tools_to_check = (
        allowed_tools
        if allowed_tools
        else (never_tools + always_tools)
    )

    # If any allowed tool requires approval, set to "always"
    if any(tool in always_tools for tool in tools_to_check):
        return "always"

    # If all allowed tools are in never list, set to "never"
    if all(tool in never_tools for tool in tools_to_check):
        return "never"

    # Mixed or undefined tools default to "never"
    return "never"


class AgentToolsGetByAgentInput(BaseModel):
    agent_id: str = Field(..., min_length=1)

    user_id: str | None = Field(
        None,
        description="Optional user ID for OAuth token refresh. If not provided, uses most recent token.",
    )
    convert_approval_to_string: bool = Field(
        default=True,
        description="Convert approval config to string format for OpenAI",
    )


class AgentToolsOutput(BaseModel):
    tools: list[dict]


class AgentToolCreateInput(BaseModel):
    agent_id: str = Field(..., min_length=1)
    tool_type: str = Field(
        ...,
        pattern=r"^(web_search_preview|mcp|code_interpreter|image_generation)$",
    )
    mcp_server_id: str | None = None
    config: dict | None = None
    allowed_tools: list[str] | None = None
    execution_order: int | None = None
    enabled: bool | None = True


class AgentToolUpdateInput(BaseModel):
    agent_tool_id: str = Field(..., min_length=1)
    tool_type: str | None = Field(
        None,
        pattern=r"^(web_search_preview|mcp|code_interpreter|image_generation)$",
    )
    mcp_server_id: str | None = None
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


@function.defn()
async def agent_tools_read_by_agent(  # noqa: C901
    function_input: AgentToolsGetByAgentInput,
) -> AgentToolsOutput:
    """Read agent tools formatted for workflow consumption."""
    async for db in get_async_db():
        try:
            agent_uuid = uuid.UUID(function_input.agent_id)
            q = select(AgentTool).where(
                AgentTool.agent_id == agent_uuid
            )
            res = await db.execute(q)
            rows = res.scalars().all()

            # Preload MCP servers
            mcp_ids = [
                r.mcp_server_id
                for r in rows
                if r.tool_type == "mcp" and r.mcp_server_id
            ]
            mcp_map: dict[str, McpServer] = {}
            if mcp_ids:
                mq = select(McpServer).where(
                    McpServer.id.in_(mcp_ids)
                )
                mres = await db.execute(mq)
                for ms in mres.scalars().all():
                    mcp_map[str(ms.id)] = ms

            tools: list[dict] = []
            for r in rows:
                if r.tool_type == "mcp" and r.mcp_server_id:
                    ms = mcp_map.get(str(r.mcp_server_id))
                    if ms:
                        # For local MCP servers, use MCP_URL environment variable instead of stored URL
                        server_url = ms.server_url
                        if getattr(ms, "local", False):
                            server_url = os.getenv("MCP_URL")

                        # Convert our internal approval format to OpenAI's expected format
                        require_approval = _convert_approval_config(
                            ms.require_approval or {},
                            r.allowed_tools or [],
                            convert_to_string=function_input.convert_approval_to_string,
                        )
                        tool_obj = {
                            "type": "mcp",
                            "server_label": ms.server_label,
                            "server_url": server_url,
                            "server_description": ms.server_description
                            or "",
                            "headers": ms.headers or {},
                            "require_approval": require_approval,
                        }
                        
                        oauth_token = (
                            await get_oauth_token_for_mcp_server(
                                GetOAuthTokenForMcpServerInput(
                                    mcp_server_id=str(ms.id),
                                    user_id=function_input.user_id,
                                )
                            )
                        )
                        if oauth_token:
                            tool_obj["authorization"] = (
                                oauth_token
                            )
                            user_context = (
                                f"user {function_input.user_id}"
                                if function_input.user_id
                                else "most recent token"
                            )
                            log.info(
                                f"Added OAuth authorization for MCP server {ms.server_label} using {user_context}"
                            )
                        else:
                            # Only log if we expect OAuth (don't spam logs for non-OAuth servers)
                            if ms.server_url and (
                                "oauth"
                                in (ms.server_url or "").lower()
                                or "api."
                                in (ms.server_url or "").lower()
                            ):
                                user_context = (
                                    f"user {function_input.user_id}"
                                    if function_input.user_id
                                    else "any user"
                                )
                                log.debug(
                                    f"No OAuth token found for MCP server {ms.server_label} for {user_context}"
                                )
                        if r.allowed_tools:
                            tool_obj["allowed_tools"] = (
                                r.allowed_tools
                            )
                        if r.config:
                            tool_obj.update(r.config)
                        tools.append(tool_obj)
                else:
                    # OpenAI official tools
                    tool_obj = {"type": r.tool_type}
                    if r.config:
                        tool_obj.update(r.config)
                    tools.append(tool_obj)

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

            agent_uuid = uuid.UUID(function_input.agent_id)
            mcp_uuid = (
                uuid.UUID(function_input.mcp_server_id)
                if function_input.mcp_server_id
                else None
            )

            # Check for existing record if it's an MCP tool
            existing_record = None
            if function_input.tool_type == "mcp" and mcp_uuid:
                existing_query = select(AgentTool).where(
                    and_(
                        AgentTool.agent_id == agent_uuid,
                        AgentTool.tool_type == "mcp",
                        AgentTool.mcp_server_id == mcp_uuid
                    )
                )
                existing_result = await db.execute(existing_query)
                existing_record = existing_result.scalar_one_or_none()

            if existing_record:
                # Update existing record
                existing_record.config = function_input.config
                existing_record.allowed_tools = function_input.allowed_tools
                existing_record.execution_order = function_input.execution_order
                existing_record.enabled = (
                    function_input.enabled
                    if function_input.enabled is not None
                    else True
                )
                record = existing_record
            else:
                # Create new tool record
                record = AgentTool(
                    id=uuid.uuid4(),
                    agent_id=agent_uuid,
                    tool_type=function_input.tool_type,
                    mcp_server_id=mcp_uuid,
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
