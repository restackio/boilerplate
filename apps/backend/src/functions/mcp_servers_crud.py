import os
import re
import uuid
from typing import Any

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)
from restack_ai.function import NonRetryableError, function
from sqlalchemy import delete, func, select

from src.database.connection import get_async_db
from src.database.models import (
    AgentTool,
    McpServer,
    UserOAuthConnection,
)

# Slug format for server_label: lowercase, letter first, then [a-z0-9_-]. Same rule on frontend.
SERVER_LABEL_SLUG_PATTERN = re.compile(r"^[a-z][a-z0-9_-]*$")
SERVER_LABEL_MAX_LENGTH = 255


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

    @field_validator("server_url", mode="before")
    @classmethod
    def validate_server_url(cls, v: str | None) -> str | None:
        """Convert empty string to None."""
        if v == "":
            return None
        return v

    @field_validator("server_label", mode="before")
    @classmethod
    def normalize_server_label(cls, v: str) -> str:
        """Strip and lowercase so we accept 'Exa-Search' and store 'exa-search'."""
        if not v or not isinstance(v, str):
            return v
        return v.strip().lower()

    @field_validator("server_label", mode="after")
    @classmethod
    def validate_server_label_slug(cls, v: str) -> str:
        """Must be a slug: letter first, then only [a-z0-9_-] (e.g. my-integration)."""
        if len(v) > SERVER_LABEL_MAX_LENGTH:
            msg = f"server_label must be at most {SERVER_LABEL_MAX_LENGTH} characters"
            raise ValueError(msg)
        if not SERVER_LABEL_SLUG_PATTERN.match(v):
            msg = (
                "server_label must be a slug: lowercase letter first, then only "
                "letters, numbers, hyphens, underscores (e.g. my-integration)"
            )
            raise ValueError(msg)
        return v


class McpServerUpdateInput(BaseModel):
    mcp_server_id: str = Field(..., min_length=1)
    server_label: str | None = Field(
        None, min_length=1, max_length=255
    )
    server_url: str | None = Field(None, max_length=500)
    local: bool | None = None
    server_description: str | None = None
    headers: dict[str, str] | None = None
    require_approval: McpRequireApproval | None = None

    @field_validator("server_url")
    @classmethod
    def validate_server_url(
        cls, v: str | None, _info: Any
    ) -> str | None:
        """Convert empty string to None."""
        if v == "":
            return None
        return v

    @field_validator("server_label", mode="before")
    @classmethod
    def normalize_server_label(cls, v: str | None) -> str | None:
        if v is None or not isinstance(v, str):
            return v
        return v.strip().lower() if v.strip() else None

    @field_validator("server_label", mode="after")
    @classmethod
    def validate_server_label_slug(
        cls, v: str | None
    ) -> str | None:
        if v is None:
            return None
        if len(v) > SERVER_LABEL_MAX_LENGTH:
            msg = f"server_label must be at most {SERVER_LABEL_MAX_LENGTH} characters"
            raise ValueError(msg)
        if not SERVER_LABEL_SLUG_PATTERN.match(v):
            msg = (
                "server_label must be a slug: lowercase letter first, then only "
                "letters, numbers, hyphens, underscores (e.g. my-integration)"
            )
            raise ValueError(msg)
        return v


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
    connections_count: int = 0
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
            # Query MCP servers with connection counts
            mcp_servers_query = (
                select(
                    McpServer,
                    func.count(UserOAuthConnection.id).label(
                        "connections_count"
                    ),
                )
                .outerjoin(
                    UserOAuthConnection,
                    McpServer.id
                    == UserOAuthConnection.mcp_server_id,
                )
                .where(
                    McpServer.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
                .group_by(McpServer.id)
                .order_by(McpServer.server_label.asc())
            )
            result = await db.execute(mcp_servers_query)
            mcp_servers_with_counts = result.all()

            output_result = [
                McpServerOutput(
                    id=str(mcp_server.id),
                    workspace_id=str(mcp_server.workspace_id),
                    server_label=mcp_server.server_label,
                    server_url=mcp_server.server_url,
                    local=getattr(mcp_server, "local", False),
                    server_description=mcp_server.server_description,
                    headers=mcp_server.headers,
                    require_approval=McpRequireApproval.model_validate(
                        mcp_server.require_approval or {}
                    ),
                    connections_count=connections_count,
                    created_at=mcp_server.created_at.isoformat()
                    if mcp_server.created_at
                    else None,
                    updated_at=mcp_server.updated_at.isoformat()
                    if mcp_server.updated_at
                    else None,
                )
                for mcp_server, connections_count in mcp_servers_with_counts
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
            # Ensure server_url is None for local servers to satisfy constraint
            server_url = (
                None
                if mcp_server_data.local
                else mcp_server_data.server_url
            )

            # Handle require_approval field safely
            require_approval_data = {}
            if mcp_server_data.require_approval:
                try:
                    require_approval_data = mcp_server_data.require_approval.model_dump()
                except (AttributeError, ValueError):
                    # Fallback to default structure if model_dump fails
                    require_approval_data = {
                        "never": {"tool_names": []},
                        "always": {"tool_names": []},
                    }
            else:
                require_approval_data = {
                    "never": {"tool_names": []},
                    "always": {"tool_names": []},
                }

            mcp_server = McpServer(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(
                    mcp_server_data.workspace_id
                ),
                server_label=mcp_server_data.server_label,
                server_url=server_url,
                local=mcp_server_data.local,
                server_description=mcp_server_data.server_description,
                headers=mcp_server_data.headers,
                require_approval=require_approval_data,
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
                    mcp_server.require_approval or {}
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
            # Log the full error details for debugging
            import traceback

            error_details = traceback.format_exc()
            error_message = f"Failed to create MCP server: {e!s}. Details: {error_details}"
            raise NonRetryableError(message=error_message) from e
    return None


@function.defn()
async def mcp_servers_update(
    function_input: McpServerUpdateInput,
) -> McpServerSingleOutput:
    """Update an existing MCP server."""
    async for db in get_async_db():
        try:
            mcp_server_query = select(McpServer).where(
                McpServer.id
                == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(mcp_server_query)
            mcp_server = result.scalar_one_or_none()

            if not mcp_server:
                raise NonRetryableError(
                    message=f"MCP server with id {function_input.mcp_server_id} not found"
                )
            update_data = function_input.dict(
                exclude_unset=True, exclude={"mcp_server_id"}
            )

            # Filter out None values to avoid overwriting existing data
            filtered_update_data = {
                k: v
                for k, v in update_data.items()
                if v is not None
            }

            for key, value in filtered_update_data.items():
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

            # Ensure constraint is satisfied: if local=True, server_url must be None
            if (
                mcp_server.local
                and mcp_server.server_url is not None
            ):
                mcp_server.server_url = None

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
                    mcp_server.require_approval or {}
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
                McpServer.id
                == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(mcp_server_query)
            mcp_server = result.scalar_one_or_none()

            if not mcp_server:
                raise NonRetryableError(
                    message=f"MCP server with id {function_input.mcp_server_id} not found"
                )

            # First delete all agent tools that reference this MCP server
            agent_tools_delete_query = delete(AgentTool).where(
                AgentTool.mcp_server_id
                == uuid.UUID(function_input.mcp_server_id)
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


class FirecrawlResolveUrlOutput(BaseModel):
    """Resolved Firecrawl hosted MCP URL with the API key embedded."""

    server_url: str
    has_key: bool


@function.defn()
async def firecrawl_resolve_url() -> FirecrawlResolveUrlOutput:
    """Resolve the Firecrawl hosted MCP URL using FIRECRAWL_API_KEY from env.

    Firecrawl supports the API key in the URL path
    (https://mcp.firecrawl.dev/{API_KEY}/v2/mcp), which avoids needing a
    separate Authorization header. We do the env lookup inside a function
    (not the workflow body) so the workflow stays deterministic and the
    key never lands in workflow input args.
    """
    api_key = os.environ.get("FIRECRAWL_API_KEY", "").strip()
    if not api_key:
        raise NonRetryableError(
            message=(
                "FIRECRAWL_API_KEY is required to create a batch agent "
                "but is not set in the backend environment."
            )
        )
    return FirecrawlResolveUrlOutput(
        server_url=f"https://mcp.firecrawl.dev/{api_key}/v2/mcp",
        has_key=True,
    )


class McpServerUpsertByLabelInput(BaseModel):
    """Idempotent upsert keyed on (workspace_id, server_label)."""

    workspace_id: str = Field(..., min_length=1)
    server_label: str = Field(..., min_length=1, max_length=255)
    server_url: str | None = Field(None, max_length=500)
    local: bool = Field(default=False)
    server_description: str | None = None
    headers: dict[str, str] | None = None
    require_approval: McpRequireApproval = Field(
        default_factory=McpRequireApproval
    )

    @field_validator("server_url", mode="before")
    @classmethod
    def validate_server_url(cls, v: str | None) -> str | None:
        if v == "":
            return None
        return v

    @field_validator("server_label", mode="before")
    @classmethod
    def normalize_server_label(cls, v: str) -> str:
        if not v or not isinstance(v, str):
            return v
        return v.strip().lower()

    @field_validator("server_label", mode="after")
    @classmethod
    def validate_server_label_slug(cls, v: str) -> str:
        if len(v) > SERVER_LABEL_MAX_LENGTH:
            msg = f"server_label must be at most {SERVER_LABEL_MAX_LENGTH} characters"
            raise ValueError(msg)
        if not SERVER_LABEL_SLUG_PATTERN.match(v):
            msg = (
                "server_label must be a slug: lowercase letter first, then only "
                "letters, numbers, hyphens, underscores (e.g. my-integration)"
            )
            raise ValueError(msg)
        return v


@function.defn()
async def mcp_servers_upsert_by_label(
    function_input: McpServerUpsertByLabelInput,
) -> McpServerSingleOutput:
    """Insert or update an MCP server keyed on (workspace_id, server_label).

    Used by auto-attach flows (e.g. batch agent creation) that need to ensure
    a workspace-level MCP integration exists without duplicating rows when
    multiple agents of the same type are created.

    On update we refresh server_url, headers, server_description and
    require_approval so that key rotations (e.g. FIRECRAWL_API_KEY embedded
    in the URL) take effect immediately for subsequent runs.
    """
    async for db in get_async_db():
        try:
            existing_query = select(McpServer).where(
                McpServer.workspace_id
                == uuid.UUID(function_input.workspace_id),
                McpServer.server_label
                == function_input.server_label,
            )
            existing_result = await db.execute(existing_query)
            mcp_server = existing_result.scalar_one_or_none()

            if function_input.require_approval:
                try:
                    require_approval_data = (
                        function_input.require_approval.model_dump()
                    )
                except (AttributeError, ValueError):
                    require_approval_data = {
                        "never": {"tool_names": []},
                        "always": {"tool_names": []},
                    }
            else:
                require_approval_data = {
                    "never": {"tool_names": []},
                    "always": {"tool_names": []},
                }

            server_url = (
                None
                if function_input.local
                else function_input.server_url
            )

            if mcp_server is None:
                mcp_server = McpServer(
                    id=uuid.uuid4(),
                    workspace_id=uuid.UUID(
                        function_input.workspace_id
                    ),
                    server_label=function_input.server_label,
                    server_url=server_url,
                    local=function_input.local,
                    server_description=function_input.server_description,
                    headers=function_input.headers,
                    require_approval=require_approval_data,
                )
                db.add(mcp_server)
            else:
                mcp_server.server_url = server_url
                mcp_server.local = function_input.local
                if function_input.server_description is not None:
                    mcp_server.server_description = (
                        function_input.server_description
                    )
                mcp_server.headers = function_input.headers
                mcp_server.require_approval = (
                    require_approval_data
                )

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
                    mcp_server.require_approval or {}
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
                message=f"Failed to upsert MCP server by label: {e!s}"
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
                McpServer.id
                == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(mcp_server_query)
            mcp_server = result.scalar_one_or_none()

            if not mcp_server:
                raise NonRetryableError(
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
                    mcp_server.require_approval or {}
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
