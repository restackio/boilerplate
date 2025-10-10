"""MCP OAuth CRUD operations for token management."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function, log
from sqlalchemy import func, select, update
from sqlalchemy.exc import SQLAlchemyError

from src.database.connection import get_async_db
from src.database.models import McpServer, UserOAuthConnection
from src.utils.token_encryption import (
    decrypt_token,
    encrypt_token,
)


def _raise_refresh_token_failed_error() -> None:
    """Raise error when OAuth token refresh fails."""
    error_message = "Failed to refresh OAuth token"
    raise NonRetryableError(message=error_message)


def _raise_database_connection_failed_error() -> None:
    """Raise error when database connection fails."""
    error_message = "Database connection failed"
    raise NonRetryableError(message=error_message)


# Input models
class GetMcpServerInput(BaseModel):
    mcp_server_id: str = Field(..., description="MCP Server ID")


class GetOAuthTokenInput(BaseModel):
    user_id: str = Field(..., description="User ID")
    mcp_server_id: str = Field(..., description="MCP Server ID")


class GetOAuthTokenForMcpServerInput(BaseModel):
    mcp_server_id: str = Field(..., description="MCP Server ID")
    user_id: str | None = Field(None, description="User ID")
    workspace_id: str | None = Field(
        None, description="Workspace ID"
    )


class SaveOAuthTokenInput(BaseModel):
    user_id: str = Field(..., description="User ID")
    workspace_id: str = Field(..., description="Workspace ID")
    mcp_server_id: str = Field(..., description="MCP Server ID")
    access_token: str = Field(..., description="Access token")
    refresh_token: str | None = Field(
        None, description="Refresh token"
    )
    token_type: str = Field(
        default="Bearer", description="Token type"
    )
    expires_in: int | None = Field(
        None, description="Token expiration in seconds"
    )
    scope: list[str] | None = Field(
        None, description="Token scopes"
    )
    auth_type: str = Field(
        default="oauth",
        description="Authentication type (oauth or bearer)",
    )
    is_default: bool = Field(
        default=False,
        description="Whether this token is the default for the workspace",
    )


class SaveBearerTokenInput(BaseModel):
    user_id: str = Field(..., description="User ID")
    workspace_id: str = Field(..., description="Workspace ID")
    mcp_server_id: str = Field(..., description="MCP Server ID")
    access_token: str = Field(..., description="Bearer token")
    is_default: bool = Field(
        default=False,
        description="Whether this token is the default for the workspace",
    )


# Output models
class McpServerOutput(BaseModel):
    id: str
    workspace_id: str
    server_label: str
    server_url: str | None
    local: bool
    server_description: str | None
    headers: dict[str, str] | None = None
    require_approval: dict | None = None

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
    is_default: bool

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
                McpServer.id
                == uuid.UUID(function_input.mcp_server_id)
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
                    headers=server.headers,
                    require_approval=server.require_approval,
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
    log.info(
        f"Starting oauth_token_create_or_update with input: {function_input}"
    )

    async for db in get_async_db():
        log.info("Database connection established")
        try:
            # Check if there are any existing connections for this MCP server in this workspace
            existing_connections_query = select(
                func.count(UserOAuthConnection.id)
            ).where(
                UserOAuthConnection.workspace_id
                == uuid.UUID(function_input.workspace_id),
                UserOAuthConnection.mcp_server_id
                == uuid.UUID(function_input.mcp_server_id),
            )
            existing_connections_result = await db.execute(
                existing_connections_query
            )
            existing_connections_count = (
                existing_connections_result.scalar()
            )

            # Auto-default if this is the first connection for this MCP server
            should_be_default = (
                function_input.is_default
                or existing_connections_count == 0
            )
            # If this token should be default, unmark any existing default tokens for this workspace and MCP server
            if should_be_default:
                await db.execute(
                    update(UserOAuthConnection)
                    .where(
                        UserOAuthConnection.workspace_id
                        == uuid.UUID(function_input.workspace_id),
                        UserOAuthConnection.mcp_server_id
                        == uuid.UUID(
                            function_input.mcp_server_id
                        ),
                        UserOAuthConnection.is_default,
                    )
                    .values(is_default=False)
                )

            # Calculate expiration time
            expires_at = None
            if function_input.expires_in:
                expires_at = (
                    datetime.now(UTC)
                    + timedelta(seconds=function_input.expires_in)
                ).replace(tzinfo=None)

            # Check if token already exists
            query = select(UserOAuthConnection).where(
                UserOAuthConnection.user_id
                == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id
                == uuid.UUID(function_input.mcp_server_id),
            )
            result = await db.execute(query)
            existing_token = result.scalar_one_or_none()

            # Encrypt tokens
            encrypted_access_token = encrypt_token(
                function_input.access_token
            )
            encrypted_refresh_token = None
            if function_input.refresh_token:
                encrypted_refresh_token = encrypt_token(
                    function_input.refresh_token
                )

            if existing_token:
                # Update existing token
                existing_token.access_token = (
                    encrypted_access_token
                )
                existing_token.refresh_token = (
                    encrypted_refresh_token
                )
                existing_token.token_type = (
                    function_input.token_type
                )
                existing_token.expires_at = expires_at
                existing_token.scope = function_input.scope
                existing_token.auth_type = (
                    function_input.auth_type
                )
                existing_token.is_default = should_be_default
                existing_token.updated_at = datetime.now(
                    UTC
                ).replace(tzinfo=None)
                token = existing_token
            else:
                # Create new token
                token = UserOAuthConnection(
                    id=uuid.uuid4(),
                    user_id=uuid.UUID(function_input.user_id),
                    workspace_id=uuid.UUID(
                        function_input.workspace_id
                    ),
                    mcp_server_id=uuid.UUID(
                        function_input.mcp_server_id
                    ),
                    access_token=encrypted_access_token,
                    refresh_token=encrypted_refresh_token,
                    token_type=function_input.token_type,
                    expires_at=expires_at,
                    scope=function_input.scope,
                    auth_type=function_input.auth_type,
                    is_default=should_be_default,
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
                    expires_at=token.expires_at.isoformat()
                    if token.expires_at
                    else None,
                    scope=token.scope,
                    connected_at=token.connected_at.isoformat(),
                    auth_type=token.auth_type,
                    is_default=token.is_default,
                )
            )

        except SQLAlchemyError as e:
            log.error(
                f"SQLAlchemy error in oauth_token_create_or_update: {e}"
            )
            raise NonRetryableError(
                message=f"Database error saving OAuth token: {e}"
            ) from e
        except Exception as e:
            log.error(
                f"Unexpected error in oauth_token_create_or_update: {e}"
            )
            log.error(f"Error type: {type(e)}")
            raise NonRetryableError(
                message=f"Unexpected error saving OAuth token: {e}"
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
        auth_type="bearer",
        is_default=function_input.is_default,
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
                UserOAuthConnection.user_id
                == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id
                == uuid.UUID(function_input.mcp_server_id),
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
                    expires_at=token.expires_at.isoformat()
                    if token.expires_at
                    else None,
                    scope=token.scope,
                    connected_at=token.connected_at.isoformat(),
                    auth_type=token.auth_type,
                    is_default=token.is_default,
                )
            )

        except SQLAlchemyError as e:
            raise NonRetryableError(
                message=f"Database error getting OAuth token: {e}"
            ) from e

    # This should never be reached due to async generator
    raise NonRetryableError(message="Database connection failed")


async def _get_connection_by_user(
    db: Any, user_id: str, mcp_server_id: str
) -> Any:
    """Get OAuth connection for specific user."""
    query = select(UserOAuthConnection).where(
        UserOAuthConnection.user_id == uuid.UUID(user_id),
        UserOAuthConnection.mcp_server_id == uuid.UUID(mcp_server_id),
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _get_connection_by_workspace(
    db: Any, workspace_id: str, mcp_server_id: str
) -> Any:
    """Get OAuth connection for workspace, preferring default, falling back to most recent."""
    # Try default token first
    query = select(UserOAuthConnection).where(
        UserOAuthConnection.workspace_id == uuid.UUID(workspace_id),
        UserOAuthConnection.mcp_server_id == uuid.UUID(mcp_server_id),
        UserOAuthConnection.is_default,
    )
    result = await db.execute(query)
    connection = result.scalar_one_or_none()

    if connection:
        return connection

    # Fallback to most recent
    query = (
        select(UserOAuthConnection)
        .where(
            UserOAuthConnection.workspace_id == uuid.UUID(workspace_id),
            UserOAuthConnection.mcp_server_id == uuid.UUID(mcp_server_id),
        )
        .order_by(
            UserOAuthConnection.last_refreshed_at.desc().nulls_last(),
            UserOAuthConnection.connected_at.desc(),
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _get_connection_fallback(db: Any, mcp_server_id: str) -> Any:
    """Get most recent OAuth connection for MCP server (any user)."""
    query = (
        select(UserOAuthConnection)
        .where(UserOAuthConnection.mcp_server_id == uuid.UUID(mcp_server_id))
        .order_by(
            UserOAuthConnection.last_refreshed_at.desc().nulls_last(),
            UserOAuthConnection.connected_at.desc(),
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _refresh_token_if_expired(
    db: Any, oauth_connection: Any, function_input: Any
) -> Any:
    """Check if token is expired and refresh if needed. Returns updated connection."""
    now = datetime.now(UTC).replace(tzinfo=None)
    if oauth_connection.expires_at and oauth_connection.expires_at <= now:
        log.info(
            f"OAuth token expired for MCP server {function_input.mcp_server_id}, attempting refresh"
        )

        try:
            refresh_user_id = function_input.user_id or str(oauth_connection.user_id)
            refresh_result = await oauth_token_refresh_and_update(
                GetOAuthTokenInput(
                    user_id=refresh_user_id,
                    mcp_server_id=function_input.mcp_server_id,
                )
            )

            if refresh_result and refresh_result.token:
                log.info(
                    f"Successfully refreshed OAuth token for MCP server {function_input.mcp_server_id}"
                )
                # Get refreshed token from database
                refreshed_query = select(UserOAuthConnection).where(
                    UserOAuthConnection.user_id == uuid.UUID(refresh_user_id),
                    UserOAuthConnection.mcp_server_id == uuid.UUID(
                        function_input.mcp_server_id
                    ),
                )
                refreshed_result = await db.execute(refreshed_query)
                return refreshed_result.scalar_one_or_none()

            log.error(
                f"Failed to refresh OAuth token for MCP server {function_input.mcp_server_id}"
            )

        except (ValueError, TypeError, AttributeError) as e:
            log.error(
                f"Error refreshing OAuth token for MCP server {function_input.mcp_server_id}: {e}"
            )
            return None
        else:
            return None

    return oauth_connection


@function.defn()
async def get_oauth_token_for_mcp_server(
    function_input: GetOAuthTokenForMcpServerInput,
) -> str | None:
    """Get OAuth token for MCP server, refreshing if needed.

    Args:
        function_input: Input containing mcp_server_id, user_id, and workspace_id

    Returns:
        The decrypted access token if available and valid, None otherwise
    """
    try:
        async for db in get_async_db():
            # Get OAuth connection based on priority: user_id > workspace_id > fallback
            if function_input.user_id:
                oauth_connection = await _get_connection_by_user(
                    db, function_input.user_id, function_input.mcp_server_id
                )
            elif function_input.workspace_id:
                oauth_connection = await _get_connection_by_workspace(
                    db, function_input.workspace_id, function_input.mcp_server_id
                )
            else:
                oauth_connection = await _get_connection_fallback(
                    db, function_input.mcp_server_id
                )

            if not oauth_connection:
                user_context = (
                    f"user {function_input.user_id}"
                    if function_input.user_id
                    else "any user"
                )
                log.info(
                    f"No OAuth connection found for {user_context} and MCP server {function_input.mcp_server_id}"
                )
                return None

            # Refresh token if expired
            oauth_connection = await _refresh_token_if_expired(
                db, oauth_connection, function_input
            )

            if not oauth_connection:
                return None

            # Decrypt and return the access token
            if oauth_connection.access_token:
                return decrypt_token(oauth_connection.access_token)

            return None

    except (ValueError, TypeError, AttributeError) as e:
        log.error(
            f"Error getting OAuth token for MCP server {function_input.mcp_server_id}: {e}"
        )
        return None

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
                UserOAuthConnection.user_id
                == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id
                == uuid.UUID(function_input.mcp_server_id),
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
                UserOAuthConnection.user_id
                == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id
                == uuid.UUID(function_input.mcp_server_id),
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


class GetDefaultTokenInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")
    mcp_server_id: str = Field(..., description="MCP Server ID")


class SetDefaultTokenByIdInput(BaseModel):
    token_id: str = Field(
        ..., description="Token ID to set as default"
    )


@function.defn()
async def oauth_token_refresh_and_update(
    function_input: GetOAuthTokenInput,
) -> SaveOAuthTokenOutput:
    """Refresh OAuth token and update database with new tokens."""
    try:
        # Import here to avoid circular imports
        from src.functions.mcp_oauth_client import (
            oauth_refresh_token,
        )

        # Step 1: Refresh the token using OAuth client
        refresh_result = await oauth_refresh_token(function_input)
        if (
            not refresh_result
            or not refresh_result.token_exchange
        ):
            _raise_refresh_token_failed_error()

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
            scope=token_data.scope.split()
            if token_data.scope
            else None,
            auth_type="oauth",
        )

        # Get existing token to fill workspace_id
        async for db in get_async_db():
            try:
                query = select(UserOAuthConnection).where(
                    UserOAuthConnection.user_id
                    == uuid.UUID(function_input.user_id),
                    UserOAuthConnection.mcp_server_id
                    == uuid.UUID(function_input.mcp_server_id),
                )
                result = await db.execute(query)
                existing_token = result.scalar_one_or_none()

                if existing_token:
                    update_input.workspace_id = str(
                        existing_token.workspace_id
                    )

                    # Update the existing token with new values
                    expires_at = None
                    if token_data.expires_in:
                        expires_at = (
                            datetime.now(UTC)
                            + timedelta(
                                seconds=token_data.expires_in
                            )
                        ).replace(tzinfo=None)

                    # Encrypt new tokens
                    existing_token.access_token = encrypt_token(
                        token_data.access_token
                    )
                    if token_data.refresh_token:
                        existing_token.refresh_token = (
                            encrypt_token(
                                token_data.refresh_token
                            )
                        )
                    existing_token.token_type = (
                        token_data.token_type or "Bearer"
                    )
                    existing_token.expires_at = expires_at
                    existing_token.scope = (
                        token_data.scope.split()
                        if token_data.scope
                        else None
                    )
                    existing_token.last_refreshed_at = (
                        datetime.now(UTC).replace(tzinfo=None)
                    )
                    existing_token.updated_at = datetime.now(
                        UTC
                    ).replace(tzinfo=None)

                    await db.commit()
                    await db.refresh(existing_token)

                    return SaveOAuthTokenOutput(
                        token=OAuthTokenOutput(
                            id=str(existing_token.id),
                            user_id=str(existing_token.user_id),
                            workspace_id=str(
                                existing_token.workspace_id
                            ),
                            mcp_server_id=str(
                                existing_token.mcp_server_id
                            ),
                            token_type=existing_token.token_type,
                            expires_at=existing_token.expires_at.isoformat()
                            if existing_token.expires_at
                            else None,
                            scope=existing_token.scope,
                            connected_at=existing_token.connected_at.isoformat(),
                            auth_type=existing_token.auth_type,
                        )
                    )
                raise NonRetryableError(
                    message="No existing token found to refresh"
                )

            except SQLAlchemyError as e:
                raise NonRetryableError(
                    message=f"Database error refreshing token: {e}"
                ) from e

        # This should never be reached due to async generator
        _raise_database_connection_failed_error()

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
            query = (
                select(UserOAuthConnection)
                .where(
                    UserOAuthConnection.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
                .order_by(UserOAuthConnection.connected_at.desc())
            )

            result = await db.execute(query)
            tokens = result.scalars().all()

            token_outputs = [
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
                    connected_at=token.connected_at.isoformat(),
                    auth_type=token.auth_type,
                    is_default=token.is_default,
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


@function.defn()
async def oauth_token_get_default(
    function_input: GetDefaultTokenInput,
) -> SaveOAuthTokenOutput | None:
    """Get the default OAuth token for a workspace and MCP server."""
    async for db in get_async_db():
        try:
            query = select(UserOAuthConnection).where(
                UserOAuthConnection.workspace_id
                == uuid.UUID(function_input.workspace_id),
                UserOAuthConnection.mcp_server_id
                == uuid.UUID(function_input.mcp_server_id),
                UserOAuthConnection.is_default,
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
                    expires_at=token.expires_at.isoformat()
                    if token.expires_at
                    else None,
                    scope=token.scope,
                    connected_at=token.connected_at.isoformat(),
                    auth_type=token.auth_type,
                    is_default=token.is_default,
                )
            )

        except SQLAlchemyError as e:
            raise NonRetryableError(
                message=f"Database error getting default token: {e}"
            ) from e

    # This should never be reached due to async generator
    raise NonRetryableError(message="Database connection failed")


@function.defn()
async def oauth_token_set_default(
    function_input: GetOAuthTokenInput,
) -> SaveOAuthTokenOutput:
    """Set a token as the default for its workspace and MCP server."""
    async for db in get_async_db():
        try:
            # Get the token to set as default
            query = select(UserOAuthConnection).where(
                UserOAuthConnection.user_id
                == uuid.UUID(function_input.user_id),
                UserOAuthConnection.mcp_server_id
                == uuid.UUID(function_input.mcp_server_id),
            )
            result = await db.execute(query)
            token = result.scalar_one_or_none()

            if not token:
                raise NonRetryableError(message="Token not found")

            # Unmark any existing default tokens for this workspace and MCP server
            await db.execute(
                update(UserOAuthConnection)
                .where(
                    UserOAuthConnection.workspace_id
                    == token.workspace_id,
                    UserOAuthConnection.mcp_server_id
                    == token.mcp_server_id,
                    UserOAuthConnection.is_default,
                )
                .values(is_default=False)
            )

            # Set this token as default
            token.is_default = True
            token.updated_at = datetime.now(UTC).replace(
                tzinfo=None
            )

            await db.commit()
            await db.refresh(token)

            return SaveOAuthTokenOutput(
                token=OAuthTokenOutput(
                    id=str(token.id),
                    user_id=str(token.user_id),
                    workspace_id=str(token.workspace_id),
                    mcp_server_id=str(token.mcp_server_id),
                    token_type=token.token_type,
                    expires_at=token.expires_at.isoformat()
                    if token.expires_at
                    else None,
                    scope=token.scope,
                    connected_at=token.connected_at.isoformat(),
                    auth_type=token.auth_type,
                    is_default=token.is_default,
                )
            )

        except SQLAlchemyError as e:
            raise NonRetryableError(
                message=f"Database error setting default token: {e}"
            ) from e

    # This should never be reached due to async generator
    raise NonRetryableError(message="Database connection failed")


@function.defn()
async def oauth_token_set_default_by_id(
    function_input: SetDefaultTokenByIdInput,
) -> SaveOAuthTokenOutput:
    """Set a token as the default for its workspace and MCP server by token ID."""
    async for db in get_async_db():
        try:
            # Get the token by ID
            query = select(UserOAuthConnection).where(
                UserOAuthConnection.id
                == uuid.UUID(function_input.token_id)
            )
            result = await db.execute(query)
            token = result.scalar_one_or_none()

            if not token:
                raise NonRetryableError(message="Token not found")

            # Unmark any existing default tokens for this workspace and MCP server
            await db.execute(
                update(UserOAuthConnection)
                .where(
                    UserOAuthConnection.workspace_id
                    == token.workspace_id,
                    UserOAuthConnection.mcp_server_id
                    == token.mcp_server_id,
                    UserOAuthConnection.is_default,
                )
                .values(is_default=False)
            )

            # Set this token as default
            token.is_default = True
            token.updated_at = datetime.now(UTC).replace(
                tzinfo=None
            )

            await db.commit()
            await db.refresh(token)

            return SaveOAuthTokenOutput(
                token=OAuthTokenOutput(
                    id=str(token.id),
                    user_id=str(token.user_id),
                    workspace_id=str(token.workspace_id),
                    mcp_server_id=str(token.mcp_server_id),
                    token_type=token.token_type,
                    expires_at=token.expires_at.isoformat()
                    if token.expires_at
                    else None,
                    scope=token.scope,
                    connected_at=token.connected_at.isoformat(),
                    auth_type=token.auth_type,
                    is_default=token.is_default,
                )
            )

        except SQLAlchemyError as e:
            raise NonRetryableError(
                message=f"Database error setting default token by ID: {e}"
            ) from e

    # This should never be reached due to async generator
    raise NonRetryableError(message="Database connection failed")
