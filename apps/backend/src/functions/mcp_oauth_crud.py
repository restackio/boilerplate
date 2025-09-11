"""MCP OAuth CRUD operations for database management."""

import uuid
from datetime import UTC, datetime, timedelta

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.database.connection import get_async_db
from src.database.models import McpServer, UserOAuthConnection
from src.utils.token_encryption import encrypt_token, decrypt_token


# Pydantic models for input validation
class GetMcpServerInput(BaseModel):
    mcp_server_id: str = Field(..., min_length=1)


class SaveOAuthTokenInput(BaseModel):
    user_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)
    mcp_server_id: str = Field(..., min_length=1)
    access_token: str = Field(..., min_length=1)
    refresh_token: str | None = Field(None)
    token_type: str = Field(default="Bearer")
    expires_in: int | None = Field(None, gt=0)
    scope: str | None = Field(None)


class GetOAuthTokenInput(BaseModel):
    user_id: str = Field(..., min_length=1)
    mcp_server_id: str = Field(..., min_length=1)


class DeleteOAuthTokenInput(BaseModel):
    user_id: str = Field(..., min_length=1)
    mcp_server_id: str = Field(..., min_length=1)


class GetOAuthTokensByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)


# Pydantic models for output serialization
class McpServerOutput(BaseModel):
    id: str
    workspace_id: str
    server_label: str
    server_url: str | None
    local: bool
    server_description: str | None
    created_at: str | None
    updated_at: str | None

    class Config:
        """Pydantic configuration."""
        from_attributes = True


class OAuthTokenOutput(BaseModel):
    id: str
    user_id: str
    workspace_id: str
    mcp_server_id: str
    token_type: str
    expires_at: str | None
    scope: list[str] | None
    connected_at: str | None
    created_at: str | None
    updated_at: str | None

    class Config:
        """Pydantic configuration."""
        from_attributes = True


# Response wrapper models
class McpServerSingleOutput(BaseModel):
    server: McpServerOutput


class OAuthTokenSingleOutput(BaseModel):
    token: OAuthTokenOutput


class OAuthTokenListOutput(BaseModel):
    tokens: list[OAuthTokenOutput]


class SuccessOutput(BaseModel):
    success: bool


class DecryptedTokenOutput(BaseModel):
    """Output model for decrypted tokens - use carefully and don't log."""
    access_token: str
    refresh_token: str | None
    token_type: str
    expires_at: str | None


# CRUD Functions

@function.defn()
async def mcp_server_get_by_id(
    function_input: GetMcpServerInput,
) -> McpServerSingleOutput:
    """Get MCP server by ID."""
    async for db in get_async_db():
        try:
            server_query = select(McpServer).where(
                McpServer.id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(server_query)
            server = result.scalar_one_or_none()

            if not server:
                raise NonRetryableError(
                    message=f"MCP server with id {function_input.mcp_server_id} not found"
                )

            output_result = McpServerOutput(
                id=str(server.id),
                workspace_id=str(server.workspace_id),
                server_label=server.server_label,
                server_url=server.server_url,
                local=server.local,
                server_description=server.server_description,
                created_at=server.created_at.isoformat()
                if server.created_at
                else None,
                updated_at=server.updated_at.isoformat()
                if server.updated_at
                else None,
            )

            return McpServerSingleOutput(server=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get MCP server: {e!s}"
            ) from e
    return None


@function.defn()
async def oauth_token_create_or_update(
    token_data: SaveOAuthTokenInput,
) -> OAuthTokenSingleOutput:
    """Create or update OAuth token."""
    async for db in get_async_db():
        try:
            # Check if connection already exists
            connection_query = select(UserOAuthConnection).where(
                UserOAuthConnection.user_id == uuid.UUID(token_data.user_id),
                UserOAuthConnection.mcp_server_id == uuid.UUID(token_data.mcp_server_id)
            )
            result = await db.execute(connection_query)
            connection = result.scalar_one_or_none()

            expires_at = None
            if token_data.expires_in:
                expires_at = datetime.now(tz=UTC).replace(tzinfo=None) + timedelta(seconds=token_data.expires_in)

            if connection:
                # Update existing connection with encrypted tokens
                connection.access_token = encrypt_token(token_data.access_token)
                connection.refresh_token = encrypt_token(token_data.refresh_token) if token_data.refresh_token else None
                connection.token_type = token_data.token_type
                connection.expires_at = expires_at
                connection.scope = token_data.scope.split(" ") if token_data.scope else []
            else:
                # Create new connection with encrypted tokens
                connection = UserOAuthConnection(
                    id=uuid.uuid4(),
                    user_id=uuid.UUID(token_data.user_id),
                    workspace_id=uuid.UUID(token_data.workspace_id),
                    mcp_server_id=uuid.UUID(token_data.mcp_server_id),
                    access_token=encrypt_token(token_data.access_token),
                    refresh_token=encrypt_token(token_data.refresh_token) if token_data.refresh_token else None,
                    token_type=token_data.token_type,
                    expires_at=expires_at,
                    scope=token_data.scope.split(" ") if token_data.scope else [],
                    connected_at=datetime.now(tz=UTC).replace(tzinfo=None)
                )
                db.add(connection)

            await db.commit()
            await db.refresh(connection)

            result = OAuthTokenOutput(
                id=str(connection.id),
                user_id=str(connection.user_id),
                workspace_id=str(connection.workspace_id),
                mcp_server_id=str(connection.mcp_server_id),
                token_type=connection.token_type,
                expires_at=connection.expires_at.isoformat()
                if connection.expires_at
                else None,
                scope=connection.scope,
                connected_at=connection.connected_at.isoformat()
                if connection.connected_at
                else None,
                created_at=connection.created_at.isoformat()
                if connection.created_at
                else None,
                updated_at=connection.updated_at.isoformat()
                if connection.updated_at
                else None,
            )

            return OAuthTokenSingleOutput(token=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to save OAuth token: {e!s}"
            ) from e
    return None


@function.defn()
async def oauth_token_get_by_user_and_server(
    function_input: GetOAuthTokenInput,
) -> OAuthTokenSingleOutput:
    """Get OAuth token by user ID and MCP server ID."""
    async for db in get_async_db():
        try:
            token_query = select(UserOAuthConnection).where(
                UserOAuthConnection.user_id == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(token_query)
            token = result.scalar_one_or_none()

            if not token:
                raise NonRetryableError(
                    message=f"OAuth token not found for user {function_input.user_id} and MCP server {function_input.mcp_server_id}"
                )

            output_result = OAuthTokenOutput(
                id=str(token.id),
                user_id=str(token.user_id),
                workspace_id=str(token.workspace_id),
                mcp_server_id=str(token.mcp_server_id),
                token_type=token.token_type,
                expires_at=token.expires_at.isoformat()
                if token.expires_at
                else None,
                scope=token.scope,
                connected_at=token.connected_at.isoformat()
                if token.connected_at
                else None,
                created_at=token.created_at.isoformat()
                if token.created_at
                else None,
                updated_at=token.updated_at.isoformat()
                if token.updated_at
                else None,
            )

            return OAuthTokenSingleOutput(token=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get OAuth token: {e!s}"
            ) from e
    return None


@function.defn()
async def oauth_token_get_decrypted(
    function_input: GetOAuthTokenInput,
) -> DecryptedTokenOutput:
    """Get decrypted OAuth tokens for actual use - handle with care."""
    async for db in get_async_db():
        try:
            token_query = select(UserOAuthConnection).where(
                UserOAuthConnection.user_id == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(token_query)
            token = result.scalar_one_or_none()

            if not token:
                raise NonRetryableError(
                    message=f"OAuth token not found for user {function_input.user_id} and MCP server {function_input.mcp_server_id}"
                )

            # Decrypt tokens for actual use
            decrypted_access_token = decrypt_token(token.access_token)
            decrypted_refresh_token = decrypt_token(token.refresh_token) if token.refresh_token else None

            return DecryptedTokenOutput(
                access_token=decrypted_access_token,
                refresh_token=decrypted_refresh_token,
                token_type=token.token_type,
                expires_at=token.expires_at.isoformat() if token.expires_at else None
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get decrypted OAuth token: {e!s}"
            ) from e
    return None


@function.defn()
async def oauth_token_delete(
    function_input: DeleteOAuthTokenInput,
) -> SuccessOutput:
    """Delete OAuth token."""
    async for db in get_async_db():
        try:
            token_query = select(UserOAuthConnection).where(
                UserOAuthConnection.user_id == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(token_query)
            token = result.scalar_one_or_none()

            if not token:
                raise NonRetryableError(
                    message=f"OAuth token not found for user {function_input.user_id} and MCP server {function_input.mcp_server_id}"
                )

            await db.delete(token)
            await db.commit()

            return SuccessOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete OAuth token: {e!s}"
            ) from e
    return None


@function.defn()
async def oauth_tokens_get_by_workspace(
    function_input: GetOAuthTokensByWorkspaceInput,
) -> OAuthTokenListOutput:
    """Get all OAuth tokens for a workspace."""
    async for db in get_async_db():
        try:
            tokens_query = (
                select(UserOAuthConnection)
                .options(selectinload(UserOAuthConnection.mcp_server))
                .where(UserOAuthConnection.workspace_id == uuid.UUID(function_input.workspace_id))
                .order_by(UserOAuthConnection.created_at.desc())
            )
            result = await db.execute(tokens_query)
            tokens = result.scalars().all()

            output_result = [
                OAuthTokenOutput(
                    id=str(token.id),
                    user_id=str(token.user_id),
                    workspace_id=str(token.workspace_id),
                    mcp_server_id=str(token.mcp_server_id),
                    token_type=token.token_type,
                    expires_at=token.expires_at.isoformat()
                    if token.expires_at
                    else None,
                    scope=token.scope,
                    connected_at=token.connected_at.isoformat()
                    if token.connected_at
                    else None,
                    created_at=token.created_at.isoformat()
                    if token.created_at
                    else None,
                    updated_at=token.updated_at.isoformat()
                    if token.updated_at
                    else None,
                )
                for token in tokens
            ]

            return OAuthTokenListOutput(tokens=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get OAuth tokens: {e!s}"
            ) from e
    return None
