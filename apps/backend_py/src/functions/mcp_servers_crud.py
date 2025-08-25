import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import select, delete

from src.database.connection import get_async_db
from src.database.models import McpServer, AgentTool


# Pydantic models for approval structure
class McpApprovalToolFilter(BaseModel):
    tool_names: list[str] = Field(default_factory=list)


class McpRequireApproval(BaseModel):
    never: McpApprovalToolFilter = Field(
        default_factory=McpApprovalToolFilter
    )
    always: McpApprovalToolFilter = Field(
        default_factory=McpApprovalToolFilter
    )


# Pydantic models for input validation
class McpServerCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    server_label: str = Field(..., min_length=1, max_length=255)
    server_url: str | None = Field(None, max_length=500)
    local: bool = Field(default=False)
    server_description: str | None = None
    headers: dict[str, str] | None = None
    require_approval: McpRequireApproval = Field(
        default_factory=McpRequireApproval
    )


class McpServerUpdateInput(BaseModel):
    mcp_server_id: str = Field(..., min_length=1)
    server_label: str | None = Field(
        None, min_length=1, max_length=255
    )
    server_url: str | None = Field(
        None, max_length=500
    )
    local: bool | None = None
    server_description: str | None = None
    headers: dict[str, str] | None = None
    require_approval: McpRequireApproval | None = None


class McpServerIdInput(BaseModel):
    mcp_server_id: str = Field(..., min_length=1)


class McpServerGetByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)


# Pydantic models for output serialization
class McpServerOutput(BaseModel):
    id: str
    workspace_id: str
    server_label: str
    server_url: str | None
    local: bool
    server_description: str | None
    headers: dict[str, str] | None
    require_approval: McpRequireApproval
    created_at: str | None
    updated_at: str | None

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class McpServerListOutput(BaseModel):
    mcp_servers: list[McpServerOutput]


class McpServerSingleOutput(BaseModel):
    mcp_server: McpServerOutput


class McpServerDeleteOutput(BaseModel):
    success: bool


@function.defn()
async def mcp_servers_read(
    function_input: McpServerGetByWorkspaceInput,
) -> McpServerListOutput:
    """Read all MCP servers from database for a specific workspace."""
    async for db in get_async_db():
        try:
            mcp_servers_query = select(McpServer).where(
                McpServer.workspace_id
                == uuid.UUID(function_input.workspace_id)
            ).order_by(McpServer.server_label.asc())
            result = await db.execute(mcp_servers_query)
            mcp_servers = result.scalars().all()

            output_result = [
                McpServerOutput(
                    id=str(mcp_server.id),
                    workspace_id=str(mcp_server.workspace_id),
                    server_label=mcp_server.server_label,
                    server_url=mcp_server.server_url,
                    local=getattr(mcp_server, 'local', False),
                    server_description=mcp_server.server_description,
                    headers=mcp_server.headers,
                    require_approval=McpRequireApproval.model_validate(
                        mcp_server.require_approval
                    ),
                    created_at=mcp_server.created_at.isoformat()
                    if mcp_server.created_at
                    else None,
                    updated_at=mcp_server.updated_at.isoformat()
                    if mcp_server.updated_at
                    else None,
                )
                for mcp_server in mcp_servers
            ]

            return McpServerListOutput(mcp_servers=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Database error: {e!s}"
            ) from e
    return None


@function.defn()
async def mcp_servers_create(
    mcp_server_data: McpServerCreateInput,
) -> McpServerSingleOutput:
    """Create a new MCP server."""
    async for db in get_async_db():
        try:
            mcp_server = McpServer(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(
                    mcp_server_data.workspace_id
                ),
                server_label=mcp_server_data.server_label,
                server_url=mcp_server_data.server_url,
                local=mcp_server_data.local,
                server_description=mcp_server_data.server_description,
                headers=mcp_server_data.headers,
                require_approval=mcp_server_data.require_approval.model_dump(),
            )
            db.add(mcp_server)
            await db.commit()
            await db.refresh(mcp_server)
            result = McpServerOutput(
                id=str(mcp_server.id),
                workspace_id=str(mcp_server.workspace_id),
                server_label=mcp_server.server_label,
                server_url=mcp_server.server_url,
                local=mcp_server.local,
                server_description=mcp_server.server_description,
                headers=mcp_server.headers,
                require_approval=McpRequireApproval.model_validate(
                    mcp_server.require_approval
                ),
                created_at=mcp_server.created_at.isoformat()
                if mcp_server.created_at
                else None,
                updated_at=mcp_server.updated_at.isoformat()
                if mcp_server.updated_at
                else None,
            )
            return McpServerSingleOutput(mcp_server=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to create MCP server: {e!s}"
            ) from e
    return None


@function.defn()
async def mcp_servers_update(
    function_input: McpServerUpdateInput,
) -> McpServerSingleOutput:
    """Update an existing MCP server."""
    async for db in get_async_db():
        try:
            mcp_server_query = select(McpServer).where(
                McpServer.id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(mcp_server_query)
            mcp_server = result.scalar_one_or_none()

            if not mcp_server:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"MCP server with id {function_input.mcp_server_id} not found"
                )
            update_data = function_input.dict(
                exclude_unset=True, exclude={"mcp_server_id"}
            )

            for key, value in update_data.items():
                if hasattr(mcp_server, key):
                    # Special handling for require_approval to convert to dict
                    if key == "require_approval" and isinstance(
                        value, McpRequireApproval
                    ):
                        setattr(
                            mcp_server, key, value.model_dump()
                        )
                    else:
                        setattr(mcp_server, key, value)

            mcp_server.updated_at = datetime.now(tz=UTC).replace(tzinfo=None)
            await db.commit()
            await db.refresh(mcp_server)
            result = McpServerOutput(
                id=str(mcp_server.id),
                workspace_id=str(mcp_server.workspace_id),
                server_label=mcp_server.server_label,
                server_url=mcp_server.server_url,
                local=mcp_server.local,
                server_description=mcp_server.server_description,
                headers=mcp_server.headers,
                require_approval=McpRequireApproval.model_validate(
                    mcp_server.require_approval
                ),
                created_at=mcp_server.created_at.isoformat()
                if mcp_server.created_at
                else None,
                updated_at=mcp_server.updated_at.isoformat()
                if mcp_server.updated_at
                else None,
            )
            return McpServerSingleOutput(mcp_server=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to update MCP server: {e!s}"
            ) from e
    return None


@function.defn()
async def mcp_servers_delete(
    function_input: McpServerIdInput,
) -> McpServerDeleteOutput:
    """Delete an MCP server."""
    async for db in get_async_db():
        try:
            mcp_server_query = select(McpServer).where(
                McpServer.id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(mcp_server_query)
            mcp_server = result.scalar_one_or_none()

            if not mcp_server:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"MCP server with id {function_input.mcp_server_id} not found"
                )
            
            # First delete all agent tools that reference this MCP server
            agent_tools_delete_query = delete(AgentTool).where(
                AgentTool.mcp_server_id == uuid.UUID(function_input.mcp_server_id)
            )
            await db.execute(agent_tools_delete_query)
            
            # Then delete the MCP server
            await db.delete(mcp_server)
            await db.commit()
            return McpServerDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete MCP server: {e!s}"
            ) from e
    return None


@function.defn()
async def mcp_servers_get_by_id(
    function_input: McpServerIdInput,
) -> McpServerSingleOutput:
    """Get MCP server by ID."""
    async for db in get_async_db():
        try:
            mcp_server_query = select(McpServer).where(
                McpServer.id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(mcp_server_query)
            mcp_server = result.scalar_one_or_none()

            if not mcp_server:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"MCP server with id {function_input.mcp_server_id} not found"
                )
            output_result = McpServerOutput(
                id=str(mcp_server.id),
                workspace_id=str(mcp_server.workspace_id),
                server_label=mcp_server.server_label,
                server_url=mcp_server.server_url,
                local=mcp_server.local,
                server_description=mcp_server.server_description,
                headers=mcp_server.headers,
                require_approval=McpRequireApproval.model_validate(
                    mcp_server.require_approval
                ),
                created_at=mcp_server.created_at.isoformat()
                if mcp_server.created_at
                else None,
                updated_at=mcp_server.updated_at.isoformat()
                if mcp_server.updated_at
                else None,
            )
            return McpServerSingleOutput(mcp_server=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get MCP server: {e!s}"
            ) from e
    return None
