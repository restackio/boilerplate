"""MCP OAuth CRUD operations for token management."""

import uuid
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError

from src.database.connection import get_async_db
from src.database.models import McpServer, UserOAuthConnection
from src.utils.token_encryption import (
    decrypt_token,
    encrypt_token,
)


# Input models
class GetMcpServerInput(BaseModel):
    mcp_server_id: str = Field(..., description="MCP Server ID")


class GetOAuthTokenInput(BaseModel):
    user_id: str = Field(..., description="User ID")
    mcp_server_id: str = Field(..., description="MCP Server ID")


class SaveOAuthTokenInput(BaseModel):
    user_id: str = Field(..., description="User ID")
    workspace_id: str = Field(..., description="Workspace ID")
    mcp_server_id: str = Field(..., description="MCP Server ID")
    access_token: str = Field(..., description="Access token")
    refresh_token: str | None = Field(None, description="Refresh token")
    token_type: str = Field(default="Bearer", description="Token type")
    expires_in: int | None = Field(None, description="Token expiration in seconds")
    scope: list[str] | None = Field(None, description="Token scopes")
    auth_type: str = Field(default="oauth", description="Authentication type (oauth or bearer)")


class SaveBearerTokenInput(BaseModel):
    user_id: str = Field(..., description="User ID")
    workspace_id: str = Field(..., description="Workspace ID")
    mcp_server_id: str = Field(..., description="MCP Server ID")
    access_token: str = Field(..., description="Bearer token")


# Output models
class McpServerOutput(BaseModel):
    id: str
    workspace_id: str
    server_label: str
    server_url: str | None
    local: bool
    server_description: str | None

    class Config:
        """Pydantic configuration."""
        from_attributes = True


class GetMcpServerOutput(BaseModel):
    server: McpServerOutput


class OAuthTokenOutput(BaseModel):
    id: str
    user_id: str
    workspace_id: str
    mcp_server_id: str
    token_type: str
    expires_at: str | None
    scope: list[str] | None
    connected_at: str
    auth_type: str

    class Config:
        """Pydantic configuration."""
        from_attributes = True


class SaveOAuthTokenOutput(BaseModel):
    token: OAuthTokenOutput


class DecryptedTokenOutput(BaseModel):
    access_token: str
    refresh_token: str | None


class DeleteTokenOutput(BaseModel):
    success: bool


class OAuthTokensListOutput(BaseModel):
    tokens: list[OAuthTokenOutput]


@function.defn()
async def mcp_server_get_by_id(
    function_input: GetMcpServerInput,
) -> GetMcpServerOutput:
    """Get MCP server by ID."""
    async for db in get_async_db():
        try:
            query = select(McpServer).where(
                McpServer.id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(query)
            server = result.scalar_one_or_none()

            if not server:
                raise NonRetryableError(
                    message=f"MCP server not found: {function_input.mcp_server_id}"
                )

            return GetMcpServerOutput(
                server=McpServerOutput(
                    id=str(server.id),
                    workspace_id=str(server.workspace_id),
                    server_label=server.server_label,
                    server_url=server.server_url,
                    local=server.local,
                    server_description=server.server_description,
                )
            )

        except SQLAlchemyError as e:
            raise NonRetryableError(
                message=f"Database error getting MCP server: {e}"
            ) from e

    # This should never be reached due to async generator
    raise NonRetryableError(message="Database connection failed")


@function.defn()
async def oauth_token_create_or_update(
    function_input: SaveOAuthTokenInput,
) -> SaveOAuthTokenOutput:
    """Create or update OAuth token."""
    async for db in get_async_db():
        try:
            # Calculate expiration time
            expires_at = None
            if function_input.expires_in:
                expires_at = (datetime.now(timezone.utc) + \
                    timedelta(seconds=function_input.expires_in)).replace(tzinfo=None)

            # Check if token already exists
            query = select(UserOAuthConnection).where(
                UserOAuthConnection.user_id == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(query)
            existing_token = result.scalar_one_or_none()

            # Encrypt tokens
            encrypted_access_token = encrypt_token(function_input.access_token)
            encrypted_refresh_token = None
            if function_input.refresh_token:
                encrypted_refresh_token = encrypt_token(function_input.refresh_token)

            if existing_token:
                # Update existing token
                existing_token.access_token = encrypted_access_token
                existing_token.refresh_token = encrypted_refresh_token
                existing_token.token_type = function_input.token_type
                existing_token.expires_at = expires_at
                existing_token.scope = function_input.scope
                existing_token.auth_type = function_input.auth_type
                existing_token.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                token = existing_token
            else:
                # Create new token
                token = UserOAuthConnection(
                    id=uuid.uuid4(),
                    user_id=uuid.UUID(function_input.user_id),
                    workspace_id=uuid.UUID(function_input.workspace_id),
                    mcp_server_id=uuid.UUID(function_input.mcp_server_id),
                    access_token=encrypted_access_token,
                    refresh_token=encrypted_refresh_token,
                    token_type=function_input.token_type,
                    expires_at=expires_at,
                    scope=function_input.scope,
                    auth_type=function_input.auth_type,
                )
                db.add(token)

            await db.commit()
            await db.refresh(token)

            return SaveOAuthTokenOutput(
                token=OAuthTokenOutput(
                    id=str(token.id),
                    user_id=str(token.user_id),
                    workspace_id=str(token.workspace_id),
                    mcp_server_id=str(token.mcp_server_id),
                    token_type=token.token_type,
                    expires_at=token.expires_at.isoformat() if token.expires_at else None,
                    scope=token.scope,
                    connected_at=token.connected_at.isoformat(),
                    auth_type=token.auth_type,
                )
            )

        except SQLAlchemyError as e:
            raise NonRetryableError(
                message=f"Database error saving OAuth token: {e}"
            ) from e

    # This should never be reached due to async generator
    raise NonRetryableError(message="Database connection failed")


@function.defn()
async def bearer_token_create_or_update(
    function_input: SaveBearerTokenInput,
) -> SaveOAuthTokenOutput:
    """Create or update Bearer token."""
    oauth_input = SaveOAuthTokenInput(
        user_id=function_input.user_id,
        workspace_id=function_input.workspace_id,
        mcp_server_id=function_input.mcp_server_id,
        access_token=function_input.access_token,
        refresh_token=None,
        token_type="Bearer",  # noqa: S106
        expires_in=None,
        scope=None,
        auth_type="bearer"
    )
    return await oauth_token_create_or_update(oauth_input)


@function.defn()
async def oauth_token_get_by_user_and_server(
    function_input: GetOAuthTokenInput,
) -> SaveOAuthTokenOutput | None:
    """Get OAuth token by user and server."""
    async for db in get_async_db():
        try:
            query = select(UserOAuthConnection).where(
                UserOAuthConnection.user_id == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(query)
            token = result.scalar_one_or_none()

            if not token:
                return None

            return SaveOAuthTokenOutput(
                token=OAuthTokenOutput(
                    id=str(token.id),
                    user_id=str(token.user_id),
                    workspace_id=str(token.workspace_id),
                    mcp_server_id=str(token.mcp_server_id),
                    token_type=token.token_type,
                    expires_at=token.expires_at.isoformat() if token.expires_at else None,
                    scope=token.scope,
                    connected_at=token.connected_at.isoformat(),
                    auth_type=token.auth_type,
                )
            )

        except SQLAlchemyError as e:
            raise NonRetryableError(
                message=f"Database error getting OAuth token: {e}"
            ) from e

    # This should never be reached due to async generator
    raise NonRetryableError(message="Database connection failed")


@function.defn()
async def oauth_token_get_decrypted(
    function_input: GetOAuthTokenInput,
) -> DecryptedTokenOutput | None:
    """Get decrypted OAuth token for actual use."""
    async for db in get_async_db():
        try:
            query = select(UserOAuthConnection).where(
                UserOAuthConnection.user_id == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(query)
            token = result.scalar_one_or_none()

            if not token:
                return None

            # Decrypt tokens
            access_token = decrypt_token(token.access_token)
            refresh_token = None
            if token.refresh_token:
                refresh_token = decrypt_token(token.refresh_token)

            return DecryptedTokenOutput(
                access_token=access_token,
                refresh_token=refresh_token,
            )

        except SQLAlchemyError as e:
            raise NonRetryableError(
                message=f"Database error getting decrypted token: {e}"
            ) from e

    # This should never be reached due to async generator
    raise NonRetryableError(message="Database connection failed")


@function.defn()
async def oauth_token_delete(
    function_input: GetOAuthTokenInput,
) -> DeleteTokenOutput:
    """Delete OAuth token by user and server."""
    async for db in get_async_db():
        try:
            query = select(UserOAuthConnection).where(
                UserOAuthConnection.user_id == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id == uuid.UUID(function_input.mcp_server_id)
            )
            result = await db.execute(query)
            token = result.scalar_one_or_none()

            if token:
                await db.delete(token)
                await db.commit()

            return DeleteTokenOutput(success=True)

        except SQLAlchemyError as e:
            raise NonRetryableError(
                message=f"Database error deleting OAuth token: {e}"
            ) from e

    # This should never be reached due to async generator
    raise NonRetryableError(message="Database connection failed")


class GetTokensByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")


@function.defn()
async def oauth_token_refresh_and_update(
    function_input: GetOAuthTokenInput,
) -> SaveOAuthTokenOutput:
    """Refresh OAuth token and update database with new tokens."""
    try:
        # Import here to avoid circular imports
        from src.functions.mcp_oauth_client import oauth_refresh_token
        
        # Step 1: Refresh the token using OAuth client
        refresh_result = await oauth_refresh_token(function_input)
        if not refresh_result or not refresh_result.token_exchange:
            raise NonRetryableError(
                message="Failed to refresh OAuth token"
            )
        
        token_data = refresh_result.token_exchange
        
        # Step 2: Update the database with new tokens
        update_input = SaveOAuthTokenInput(
            user_id=function_input.user_id,
            workspace_id="",  # Will be filled from existing token
            mcp_server_id=function_input.mcp_server_id,
            access_token=token_data.access_token,
            refresh_token=token_data.refresh_token,
            token_type=token_data.token_type or "Bearer",
            expires_in=token_data.expires_in,
            scope=token_data.scope.split() if token_data.scope else None,
            auth_type="oauth"
        )
        
        # Get existing token to fill workspace_id
        async for db in get_async_db():
            try:
                query = select(UserOAuthConnection).where(
                    UserOAuthConnection.user_id == uuid.UUID(function_input.user_id),
                    UserOAuthConnection.mcp_server_id == uuid.UUID(function_input.mcp_server_id)
                )
                result = await db.execute(query)
                existing_token = result.scalar_one_or_none()
                
                if existing_token:
                    update_input.workspace_id = str(existing_token.workspace_id)
                    
                    # Update the existing token with new values
                    expires_at = None
                    if token_data.expires_in:
                        expires_at = (datetime.now(timezone.utc) + 
                            timedelta(seconds=token_data.expires_in)).replace(tzinfo=None)
                    
                    # Encrypt new tokens
                    existing_token.access_token = encrypt_token(token_data.access_token)
                    if token_data.refresh_token:
                        existing_token.refresh_token = encrypt_token(token_data.refresh_token)
                    existing_token.token_type = token_data.token_type or "Bearer"
                    existing_token.expires_at = expires_at
                    existing_token.scope = token_data.scope.split() if token_data.scope else None
                    existing_token.last_refreshed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                    existing_token.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                    
                    await db.commit()
                    await db.refresh(existing_token)
                    
                    return SaveOAuthTokenOutput(
                        token=OAuthTokenOutput(
                            id=str(existing_token.id),
                            user_id=str(existing_token.user_id),
                            workspace_id=str(existing_token.workspace_id),
                            mcp_server_id=str(existing_token.mcp_server_id),
                            token_type=existing_token.token_type,
                            expires_at=existing_token.expires_at.isoformat() if existing_token.expires_at else None,
                            scope=existing_token.scope,
                            connected_at=existing_token.connected_at.isoformat(),
                            auth_type=existing_token.auth_type,
                        )
                    )
                else:
                    raise NonRetryableError(
                        message="No existing token found to refresh"
                    )
                    
            except SQLAlchemyError as e:
                raise NonRetryableError(
                    message=f"Database error refreshing token: {e}"
                ) from e
        
        # This should never be reached due to async generator
        raise NonRetryableError(message="Database connection failed")
        
    except NonRetryableError:
        raise
    except Exception as e:
        raise NonRetryableError(
            message=f"Failed to refresh and update token: {e}"
        ) from e


@function.defn()
async def oauth_tokens_get_by_workspace(
    function_input: GetTokensByWorkspaceInput,
) -> OAuthTokensListOutput:
    """Get all OAuth tokens for a workspace."""
    async for db in get_async_db():
        try:
            query = select(UserOAuthConnection).where(
                UserOAuthConnection.workspace_id == uuid.UUID(function_input.workspace_id)
            ).order_by(UserOAuthConnection.connected_at.desc())
            
            result = await db.execute(query)
            tokens = result.scalars().all()

            token_outputs = [
                OAuthTokenOutput(
                    id=str(token.id),
                    user_id=str(token.user_id),
                    workspace_id=str(token.workspace_id),
                    mcp_server_id=str(token.mcp_server_id),
                    token_type=token.token_type,
                    expires_at=token.expires_at.isoformat() if token.expires_at else None,
                    scope=token.scope,
                    connected_at=token.connected_at.isoformat(),
                    auth_type=token.auth_type,
                )
                for token in tokens
            ]

            return OAuthTokensListOutput(tokens=token_outputs)

        except SQLAlchemyError as e:
            raise NonRetryableError(
                message=f"Database error getting workspace tokens: {e}"
            ) from e

    # This should never be reached due to async generator
    raise NonRetryableError(message="Database connection failed")
