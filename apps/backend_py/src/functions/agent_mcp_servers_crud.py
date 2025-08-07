import uuid

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.database.connection import get_async_db
from src.database.models import AgentMcpServer


# Pydantic models for input validation
class AgentMcpServerCreateInput(BaseModel):
    agent_id: str = Field(..., min_length=1)
    mcp_server_id: str = Field(..., min_length=1)
    allowed_tools: list[str] | None = None


class AgentMcpServerUpdateInput(BaseModel):
    agent_mcp_server_id: str = Field(..., min_length=1)
    allowed_tools: list[str] | None = None


class AgentMcpServerIdInput(BaseModel):
    agent_mcp_server_id: str = Field(..., min_length=1)


class AgentMcpServerGetByAgentInput(BaseModel):
    agent_id: str = Field(..., min_length=1)


class AgentMcpServerGetByMcpServerInput(BaseModel):
    mcp_server_id: str = Field(..., min_length=1)


# Pydantic models for output serialization
class AgentMcpServerOutput(BaseModel):
    id: str
    agent_id: str
    mcp_server_id: str
    allowed_tools: list[str] | None
    created_at: str | None
    # Include related data for convenience
    agent_name: str | None = None
    mcp_server_label: str | None = None
    mcp_server_url: str | None = None

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class AgentMcpServerListOutput(BaseModel):
    agent_mcp_servers: list[AgentMcpServerOutput]


class AgentMcpServerSingleOutput(BaseModel):
    agent_mcp_server: AgentMcpServerOutput


class AgentMcpServerDeleteOutput(BaseModel):
    success: bool


@function.defn()
async def agent_mcp_servers_read_by_agent(
    function_input: AgentMcpServerGetByAgentInput,
) -> AgentMcpServerListOutput:
    """Read all MCP servers for a specific agent."""
    async for db in get_async_db():
        try:
            agent_mcp_servers_query = (
                select(AgentMcpServer)
                .options(selectinload(AgentMcpServer.mcp_server))
                .where(
                    AgentMcpServer.agent_id
                    == uuid.UUID(function_input.agent_id)
                )
            )
            result = await db.execute(agent_mcp_servers_query)
            agent_mcp_servers = result.scalars().all()

            output_result = []
            for agent_mcp_server in agent_mcp_servers:
                output_result.append(  # noqa: PERF401
                    AgentMcpServerOutput(
                        id=str(agent_mcp_server.id),
                        agent_id=str(agent_mcp_server.agent_id),
                        mcp_server_id=str(
                            agent_mcp_server.mcp_server_id
                        ),
                        allowed_tools=agent_mcp_server.allowed_tools,
                        created_at=agent_mcp_server.created_at.isoformat()
                        if agent_mcp_server.created_at
                        else None,
                        mcp_server_label=agent_mcp_server.mcp_server.server_label,
                        mcp_server_url=agent_mcp_server.mcp_server.server_url,
                    )
                )

            return AgentMcpServerListOutput(
                agent_mcp_servers=output_result
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Database error: {e!s}"
            ) from e
    return None


@function.defn()
async def agent_mcp_servers_create(
    agent_mcp_server_data: AgentMcpServerCreateInput,
) -> AgentMcpServerSingleOutput:
    """Create a new agent-MCP server relationship."""
    async for db in get_async_db():
        try:
            # Check if the relationship already exists
            existing_query = select(AgentMcpServer).where(
                AgentMcpServer.agent_id
                == uuid.UUID(agent_mcp_server_data.agent_id),
                AgentMcpServer.mcp_server_id
                == uuid.UUID(agent_mcp_server_data.mcp_server_id),
            )
            existing_result = await db.execute(existing_query)
            existing = existing_result.scalar_one_or_none()

            if existing:
                raise NonRetryableError(  # noqa: TRY301
                    message="Agent-MCP server relationship already exists"
                )
            agent_mcp_server = AgentMcpServer(
                id=uuid.uuid4(),
                agent_id=uuid.UUID(
                    agent_mcp_server_data.agent_id
                ),
                mcp_server_id=uuid.UUID(
                    agent_mcp_server_data.mcp_server_id
                ),
                allowed_tools=agent_mcp_server_data.allowed_tools,
            )
            db.add(agent_mcp_server)
            await db.commit()
            await db.refresh(agent_mcp_server)

            # Load the related mcp_server data
            await db.refresh(agent_mcp_server, ["mcp_server"])

            result = AgentMcpServerOutput(
                id=str(agent_mcp_server.id),
                agent_id=str(agent_mcp_server.agent_id),
                mcp_server_id=str(agent_mcp_server.mcp_server_id),
                allowed_tools=agent_mcp_server.allowed_tools,
                created_at=agent_mcp_server.created_at.isoformat()
                if agent_mcp_server.created_at
                else None,
                mcp_server_label=agent_mcp_server.mcp_server.server_label
                if agent_mcp_server.mcp_server
                else None,
                mcp_server_url=agent_mcp_server.mcp_server.server_url
                if agent_mcp_server.mcp_server
                else None,
            )
            return AgentMcpServerSingleOutput(
                agent_mcp_server=result
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to create agent-MCP server relationship: {e!s}"
            ) from e
    return None


@function.defn()
async def agent_mcp_servers_update(
    function_input: AgentMcpServerUpdateInput,
) -> AgentMcpServerSingleOutput:
    """Update an existing agent-MCP server relationship."""
    async for db in get_async_db():
        try:
            agent_mcp_server_query = (
                select(AgentMcpServer)
                .options(selectinload(AgentMcpServer.mcp_server))
                .where(
                    AgentMcpServer.id
                    == uuid.UUID(function_input.agent_mcp_server_id)
                )
            )
            result = await db.execute(agent_mcp_server_query)
            agent_mcp_server = result.scalar_one_or_none()

            if not agent_mcp_server:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Agent-MCP server relationship with id {function_input.agent_mcp_server_id} not found"
                )
            update_data = function_input.dict(
                exclude_unset=True,
                exclude={"agent_mcp_server_id"},
            )

            for key, value in update_data.items():
                if hasattr(agent_mcp_server, key):
                    setattr(agent_mcp_server, key, value)

            await db.commit()
            await db.refresh(agent_mcp_server)

            # Load the related mcp_server data
            await db.refresh(agent_mcp_server, ["mcp_server"])

            output_result = AgentMcpServerOutput(
                id=str(agent_mcp_server.id),
                agent_id=str(agent_mcp_server.agent_id),
                mcp_server_id=str(agent_mcp_server.mcp_server_id),
                allowed_tools=agent_mcp_server.allowed_tools,
                created_at=agent_mcp_server.created_at.isoformat()
                if agent_mcp_server.created_at
                else None,
                mcp_server_label=agent_mcp_server.mcp_server.server_label
                if agent_mcp_server.mcp_server
                else None,
                mcp_server_url=agent_mcp_server.mcp_server.server_url
                if agent_mcp_server.mcp_server
                else None,
            )
            return AgentMcpServerSingleOutput(
                agent_mcp_server=output_result
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to update agent-MCP server relationship: {e!s}"
            ) from e
    return None


@function.defn()
async def agent_mcp_servers_delete(
    function_input: AgentMcpServerIdInput,
) -> AgentMcpServerDeleteOutput:
    """Delete an agent-MCP server relationship."""
    async for db in get_async_db():
        try:
            agent_mcp_server_query = select(AgentMcpServer).where(
                AgentMcpServer.id
                == uuid.UUID(function_input.agent_mcp_server_id)
            )
            result = await db.execute(agent_mcp_server_query)
            agent_mcp_server = result.scalar_one_or_none()

            if not agent_mcp_server:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Agent-MCP server relationship with id {function_input.agent_mcp_server_id} not found"
                )
            await db.delete(agent_mcp_server)
            await db.commit()
            return AgentMcpServerDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete agent-MCP server relationship: {e!s}"
            ) from e
    return None


@function.defn()
async def agent_mcp_servers_get_by_id(
    function_input: AgentMcpServerIdInput,
) -> AgentMcpServerSingleOutput:
    """Get agent-MCP server relationship by ID."""
    async for db in get_async_db():
        try:
            agent_mcp_server_query = (
                select(AgentMcpServer)
                .options(selectinload(AgentMcpServer.mcp_server))
                .where(
                    AgentMcpServer.id
                    == uuid.UUID(function_input.agent_mcp_server_id)
                )
            )
            result = await db.execute(agent_mcp_server_query)
            agent_mcp_server = result.scalar_one_or_none()

            if not agent_mcp_server:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Agent-MCP server relationship with id {function_input.agent_mcp_server_id} not found"
                )
            output_result = AgentMcpServerOutput(
                id=str(agent_mcp_server.id),
                agent_id=str(agent_mcp_server.agent_id),
                mcp_server_id=str(agent_mcp_server.mcp_server_id),
                allowed_tools=agent_mcp_server.allowed_tools,
                created_at=agent_mcp_server.created_at.isoformat()
                if agent_mcp_server.created_at
                else None,
                mcp_server_label=agent_mcp_server.mcp_server.server_label
                if agent_mcp_server.mcp_server
                else None,
                mcp_server_url=agent_mcp_server.mcp_server.server_url
                if agent_mcp_server.mcp_server
                else None,
            )
            return AgentMcpServerSingleOutput(
                agent_mcp_server=output_result
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get agent-MCP server relationship: {e!s}"
            ) from e
    return None
