import os
import uuid

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import select

from src.database.connection import get_async_db
from src.database.models import AgentTool, McpServer


class AgentToolsGetByAgentInput(BaseModel):
    agent_id: str = Field(..., min_length=1)


class AgentToolsOutput(BaseModel):
    tools: list[dict]


class AgentToolCreateInput(BaseModel):
    agent_id: str = Field(..., min_length=1)
    tool_type: str = Field(
        ..., pattern=r"^(web_search_preview|mcp|code_interpreter|image_generation)$"
    )
    mcp_server_id: str | None = None
    config: dict | None = None
    allowed_tools: list[str] | None = None
    execution_order: int | None = None
    enabled: bool | None = True


class AgentToolUpdateInput(BaseModel):
    agent_tool_id: str = Field(..., min_length=1)
    tool_type: str | None = Field(
        None, pattern=r"^(web_search_preview|mcp|code_interpreter|image_generation)$"
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
            q = select(AgentTool).where(AgentTool.agent_id == agent_uuid)
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
                mq = select(McpServer).where(McpServer.id.in_(mcp_ids))
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

                        tool_obj = {
                            "type": "mcp",
                            "server_label": ms.server_label,
                            "server_url": server_url,
                            "server_description": ms.server_description or "",
                            "headers": ms.headers or {},
                            "require_approval": ms.require_approval or {},
                        }
                        if r.allowed_tools:
                            tool_obj["allowed_tools"] = r.allowed_tools
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
            raise NonRetryableError(message=f"Failed to read agent tools: {e!s}") from e
    return None  # pragma: no cover


@function.defn()
async def agent_tools_read_records_by_agent(
    function_input: AgentToolsGetByAgentInput,
) -> AgentToolListOutput:
    """Read agent tools as structured records for UI consumption."""
    async for db in get_async_db():
        try:
            agent_uuid = uuid.UUID(function_input.agent_id)
            q = select(AgentTool).where(AgentTool.agent_id == agent_uuid)
            res = await db.execute(q)
            rows = res.scalars().all()

            # Enrich with MCP server info
            mcp_ids = [r.mcp_server_id for r in rows if r.mcp_server_id]
            mcp_map: dict[str, McpServer] = {}
            if mcp_ids:
                mq = select(McpServer).where(McpServer.id.in_(mcp_ids))
                mres = await db.execute(mq)
                for ms in mres.scalars().all():
                    mcp_map[str(ms.id)] = ms

            outputs = [
                AgentToolOutput(
                    id=str(r.id),
                    agent_id=str(r.agent_id),
                    tool_type=r.tool_type,
                    mcp_server_id=str(r.mcp_server_id) if r.mcp_server_id else None,
                    config=r.config,
                    allowed_tools=r.allowed_tools,
                    execution_order=r.execution_order,
                    enabled=bool(r.enabled) if r.enabled is not None else True,
                    created_at=r.created_at.isoformat() if getattr(r, "created_at", None) else None,
                    mcp_server_label=mcp_map.get(str(r.mcp_server_id)).server_label if r.mcp_server_id and mcp_map.get(str(r.mcp_server_id)) else None,
                )
                for r in rows
            ]

            return AgentToolListOutput(agent_tools=outputs)
        except Exception as e:
            raise NonRetryableError(message=f"Failed to read agent tools records: {e!s}") from e
    return None  # pragma: no cover


@function.defn()
async def agent_tools_create(
    function_input: AgentToolCreateInput,
) -> AgentToolSingleOutput:
    """Create a new agent tool (MCP or OpenAI official tool)."""
    async for db in get_async_db():
        try:
            # Basic validations per tool type
            if function_input.tool_type == "mcp" and not function_input.mcp_server_id:
                raise NonRetryableError(message="mcp_server_id required for tool_type=mcp")  # noqa: TRY301

            agent_uuid = uuid.UUID(function_input.agent_id)
            mcp_uuid = (
                uuid.UUID(function_input.mcp_server_id)
                if function_input.mcp_server_id
                else None
            )

            # Create the tool record
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
                mq = select(McpServer).where(McpServer.id == record.mcp_server_id)
                mres = await db.execute(mq)
                m = mres.scalar_one_or_none()
                if m:
                    mcp_label = m.server_label

            return AgentToolSingleOutput(
                agent_tool=AgentToolOutput(
                    id=str(record.id),
                    agent_id=str(record.agent_id),
                    tool_type=record.tool_type,
                    mcp_server_id=str(record.mcp_server_id) if record.mcp_server_id else None,
                    config=record.config,
                    allowed_tools=record.allowed_tools,
                    execution_order=record.execution_order,
                    enabled=bool(record.enabled) if record.enabled is not None else True,
                    created_at=record.created_at.isoformat() if getattr(record, "created_at", None) else None,
                    mcp_server_label=mcp_label,
                )
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to create agent tool: {e!s}") from e
    return None  # pragma: no cover


@function.defn()
async def agent_tools_update(
    function_input: AgentToolUpdateInput,
) -> AgentToolSingleOutput:
    """Update an existing agent tool."""
    async for db in get_async_db():
        try:
            q = select(AgentTool).where(AgentTool.id == uuid.UUID(function_input.agent_tool_id))
            res = await db.execute(q)
            record = res.scalar_one_or_none()
            if not record:
                raise NonRetryableError(message=f"Agent tool with id {function_input.agent_tool_id} not found")  # noqa: TRY301

            update_data = function_input.dict(exclude_unset=True, exclude={"agent_tool_id"})
            if "mcp_server_id" in update_data:
                update_data["mcp_server_id"] = uuid.UUID(update_data["mcp_server_id"]) if update_data["mcp_server_id"] else None

            for key, value in update_data.items():
                if hasattr(record, key):
                    setattr(record, key, value)

            await db.commit()
            await db.refresh(record)

            # Enrich with MCP server info
            mcp_label = None
            if record.mcp_server_id:
                mq = select(McpServer).where(McpServer.id == record.mcp_server_id)
                mres = await db.execute(mq)
                m = mres.scalar_one_or_none()
                if m:
                    mcp_label = m.server_label

            return AgentToolSingleOutput(
                agent_tool=AgentToolOutput(
                    id=str(record.id),
                    agent_id=str(record.agent_id),
                    tool_type=record.tool_type,
                    mcp_server_id=str(record.mcp_server_id) if record.mcp_server_id else None,
                    config=record.config,
                    allowed_tools=record.allowed_tools,
                    execution_order=record.execution_order,
                    enabled=bool(record.enabled) if record.enabled is not None else True,
                    created_at=record.created_at.isoformat() if getattr(record, "created_at", None) else None,
                    mcp_server_label=mcp_label,
                )
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to update agent tool: {e!s}") from e
    return None  # pragma: no cover


@function.defn()
async def agent_tools_delete(
    function_input: AgentToolIdInput,
) -> AgentToolDeleteOutput:
    """Delete an agent tool."""
    async for db in get_async_db():
        try:
            q = select(AgentTool).where(AgentTool.id == uuid.UUID(function_input.agent_tool_id))
            res = await db.execute(q)
            record = res.scalar_one_or_none()
            if not record:
                raise NonRetryableError(message=f"Agent tool with id {function_input.agent_tool_id} not found")  # noqa: TRY301
            await db.delete(record)
            await db.commit()
            return AgentToolDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to delete agent tool: {e!s}") from e
    return None  # pragma: no cover
