"""Multi-step MCP OAuth workflows using CRUD operations."""

from datetime import timedelta
from typing import Any

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.mcp_oauth_client import (
        ParseCallbackInput,
        oauth_exchange_code_for_token,
        oauth_generate_auth_url,
        oauth_parse_callback,
    )
    from src.functions.mcp_oauth_crud import (
        DeleteTokenOutput,
        GetMcpServerInput,
        GetOAuthTokenInput,
        GetTokensByWorkspaceInput,
        OAuthTokensListOutput,
        SaveBearerTokenInput,
        SaveOAuthTokenInput,
        SaveOAuthTokenOutput,
        SetDefaultTokenByIdInput,
        bearer_token_create_or_update,
        mcp_server_get_by_id,
        oauth_token_create_or_update,
        oauth_token_delete,
        oauth_token_refresh_and_update,
        oauth_token_set_default,
        oauth_token_set_default_by_id,
        oauth_tokens_get_by_workspace,
    )


# Input models for workflows
from pydantic import BaseModel, Field


class McpOAuthInitializeWorkflowInput(BaseModel):
    user_id: str = Field(..., description="User ID")
    workspace_id: str = Field(..., description="Workspace ID")
    mcp_server_id: str = Field(..., description="MCP Server ID")


class McpOAuthCallbackWorkflowInput(BaseModel):
    user_id: str = Field(..., description="User ID")
    workspace_id: str = Field(..., description="Workspace ID")
    mcp_server_id: str = Field(..., description="MCP Server ID")
    callback_url: str = Field(
        ..., description="OAuth callback URL"
    )
    client_id: str | None = Field(
        None,
        description="OAuth client ID from authorization phase",
    )
    client_secret: str | None = Field(
        None,
        description="OAuth client secret from authorization phase",
    )


@workflow.defn()
class McpOAuthInitializeWorkflow:
    """Multi-step workflow to initialize MCP OAuth flow."""

    @workflow.run
    async def run(
        self, request: McpOAuthInitializeWorkflowInput
    ) -> dict[str, Any]:
        """Multi-step OAuth initialization.

        1. Get MCP server configuration
        2. Generate OAuth authorization URL with PKCE parameters
        3. Return auth URL and client credentials for frontend
        """
        log.info(
            "McpOAuthInitializeWorkflow started", request=request
        )

        try:
            # Step 1: Get MCP server configuration
            log.info("Step 1: Getting MCP server configuration")
            server_result = await workflow.step(
                function=mcp_server_get_by_id,
                function_input=GetMcpServerInput(
                    mcp_server_id=request.mcp_server_id
                ),
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not server_result or not server_result.server:
                log.error("Failed to get MCP server")
                return {
                    "success": False,
                    "error": "Failed to get MCP server",
                }

            server = server_result.server
            log.info(
                "MCP server found", server_url=server.server_url
            )

            # Step 2: Generate OAuth authorization URL using MCP SDK with workflow state
            log.info("Step 2: Generating OAuth authorization URL")
            from src.functions.mcp_oauth_client import (
                GenerateAuthUrlInput,
            )

            auth_url_result = await workflow.step(
                function=oauth_generate_auth_url,
                function_input=GenerateAuthUrlInput(
                    server_url=server.server_url,
                    server_label=server.server_label,
                    user_id=request.user_id,
                    workspace_id=request.workspace_id,
                    redirect_uri="http://localhost:3000/oauth/callback",
                ),
                start_to_close_timeout=timedelta(seconds=60),
            )

            if (
                not auth_url_result
                or not auth_url_result.auth_url
            ):
                log.error("Failed to generate authorization URL")
                return {
                    "success": False,
                    "error": "Failed to generate OAuth authorization URL",
                    "server_url": server.server_url,
                    "server_label": server.server_label,
                }

            log.info(
                "OAuth authorization URL generated successfully"
            )

            # Extract client_id from the authorization URL for use in callback
            from urllib.parse import parse_qs, urlparse

            parsed_url = urlparse(
                auth_url_result.auth_url.authorization_url
            )
            query_params = parse_qs(parsed_url.query)
            client_id = query_params.get("client_id", [None])[0]

            return {  # noqa: TRY300
                "success": True,
                "authorization_url": auth_url_result.auth_url.authorization_url,
                "state": auth_url_result.auth_url.state,
                "client_id": client_id,
                "client_secret": auth_url_result.auth_url.client_secret,
                "server_url": server.server_url,
                "server_label": server.server_label,
            }

        except (ValueError, TypeError, AttributeError) as e:
            error_message = (
                f"Error during MCP OAuth initialize workflow: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class McpOAuthCallbackWorkflow:
    """Multi-step workflow to handle MCP OAuth callback."""

    @workflow.run
    async def run(
        self, request: McpOAuthCallbackWorkflowInput
    ) -> dict[str, Any]:
        """Multi-step OAuth callback handling.

        1. Parse callback URL to extract authorization code and state
        2. Get MCP server configuration
        3. Exchange code for tokens using PKCE verification
        4. Save tokens to database
        """
        log.info(
            "McpOAuthCallbackWorkflow started", request=request
        )

        try:
            # Step 1: Parse callback URL
            log.info("Step 1: Parsing OAuth callback URL")
            callback_result = await workflow.step(
                function=oauth_parse_callback,
                function_input=ParseCallbackInput(
                    callback_url=request.callback_url
                ),
                start_to_close_timeout=timedelta(seconds=10),
            )

            if (
                not callback_result
                or not callback_result.callback
            ):
                log.error("Failed to parse callback")
                return {
                    "success": False,
                    "error": "Failed to parse callback URL",
                }

            code = callback_result.callback.code
            state = callback_result.callback.state
            log.info(
                "Callback parsed successfully",
                code_length=len(code) if code else 0,
            )

            # Step 2: Get MCP server configuration
            log.info("Step 2: Getting MCP server configuration")
            server_result = await workflow.step(
                function=mcp_server_get_by_id,
                function_input=GetMcpServerInput(
                    mcp_server_id=request.mcp_server_id
                ),
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not server_result or not server_result.server:
                log.error("Failed to get MCP server")
                return {
                    "success": False,
                    "error": "Failed to get MCP server",
                }

            # Step 3: Exchange code for tokens using MCP SDK
            log.info(
                "Step 3: Exchanging authorization code for tokens"
            )
            from src.functions.mcp_oauth_client import (
                ExchangeCodeForTokenInput,
            )

            token_result = await workflow.step(
                function=oauth_exchange_code_for_token,
                function_input=ExchangeCodeForTokenInput(
                    server_url=server_result.server.server_url,
                    server_label=server_result.server.server_label,
                    user_id=request.user_id,
                    workspace_id=request.workspace_id,
                    code=code,
                    state=state,
                    redirect_uri="http://localhost:3000/oauth/callback",
                    client_id=request.client_id,  # Pass the client_id from authorization phase
                    client_secret=request.client_secret,  # Pass the client_secret from authorization phase
                ),
                start_to_close_timeout=timedelta(seconds=60),
            )

            if (
                not token_result
                or not token_result.token_exchange
            ):
                log.error("Failed to exchange code for tokens")
                return {
                    "success": False,
                    "error": "Failed to exchange authorization code for tokens",
                    "code": code,
                    "state": state,
                    "server_url": server_result.server.server_url,
                }

            token_data = token_result.token_exchange
            log.info("Token exchange successful")

            # Step 4: Save client credentials to MCP server headers
            if token_data.client_id and token_data.client_secret:
                log.info(
                    "Step 4: Saving client credentials to MCP server"
                )
                from src.functions.mcp_servers_crud import (
                    McpServerUpdateInput,
                    mcp_servers_update,
                )

                # Update MCP server headers with client credentials
                current_headers = (
                    server_result.server.headers or {}
                )
                updated_headers = {
                    **current_headers,
                    "oauth_client_id": token_data.client_id,
                    "oauth_client_secret": token_data.client_secret,
                }

                await workflow.step(
                    function=mcp_servers_update,
                    function_input=McpServerUpdateInput(
                        mcp_server_id=request.mcp_server_id,
                        headers=updated_headers,
                    ),
                    start_to_close_timeout=timedelta(seconds=30),
                )
                log.info(
                    "Successfully stored client credentials in MCP server headers"
                )

            # Step 5: Save tokens to database
            log.info("Step 5: Saving OAuth tokens to database")
            save_result = await workflow.step(
                function=oauth_token_create_or_update,
                function_input=SaveOAuthTokenInput(
                    user_id=request.user_id,
                    workspace_id=request.workspace_id,
                    mcp_server_id=request.mcp_server_id,
                    access_token=token_data.access_token,
                    refresh_token=token_data.refresh_token,
                    token_type=token_data.token_type or "Bearer",
                    expires_in=token_data.expires_in,
                    scope=token_data.scope.split()
                    if token_data.scope
                    else None,
                    auth_type="oauth",
                    is_default=False,
                ),
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not save_result or not save_result.token:
                log.error("Failed to save OAuth tokens")
                return {
                    "success": False,
                    "error": "Failed to save OAuth tokens to database",
                }

            log.info("OAuth flow completed successfully")
            return {  # noqa: TRY300
                "success": True,
                "message": "OAuth connection established successfully",
                "token_id": save_result.token.id,
                "server_url": server_result.server.server_url,
            }

        except (ValueError, TypeError, AttributeError) as e:
            error_message = (
                f"Error during MCP OAuth callback workflow: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class OAuthTokensGetByWorkspaceWorkflow:
    """Workflow to get OAuth tokens by workspace."""

    @workflow.run
    async def run(
        self, workflow_input: GetTokensByWorkspaceInput
    ) -> OAuthTokensListOutput:
        """Get OAuth tokens for a workspace."""
        try:
            log.info(
                f"Getting OAuth tokens for workspace: {workflow_input.workspace_id}"
            )

            result = await workflow.step(
                function=oauth_tokens_get_by_workspace,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            log.info(
                f"Successfully retrieved {len(result.tokens)} tokens"
            )
            return result  # noqa: TRY300

        except (ValueError, TypeError, AttributeError) as e:
            error_message = (
                f"Error getting OAuth tokens by workspace: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class BearerTokenCreateWorkflow:
    """Workflow to create a Bearer token."""

    @workflow.run
    async def run(
        self, workflow_input: SaveBearerTokenInput
    ) -> SaveOAuthTokenOutput:
        """Create a Bearer token."""
        try:
            log.info(
                f"Creating Bearer token for server: {workflow_input.mcp_server_id}"
            )

            result = await workflow.step(
                function=bearer_token_create_or_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            log.info(
                f"Successfully created Bearer token with ID: {result.token.id}"
            )
            return result  # noqa: TRY300

        except (ValueError, TypeError, AttributeError) as e:
            error_message = f"Error creating Bearer token: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class OAuthTokenDeleteWorkflow:
    """Workflow to delete an OAuth token."""

    @workflow.run
    async def run(
        self, workflow_input: GetOAuthTokenInput
    ) -> DeleteTokenOutput:
        """Delete an OAuth token."""
        try:
            log.info(
                f"Deleting OAuth token for user: {workflow_input.user_id}, server: {workflow_input.mcp_server_id}"
            )

            result = await workflow.step(
                function=oauth_token_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            log.info(
                f"Successfully deleted OAuth token for user: {workflow_input.user_id}, server: {workflow_input.mcp_server_id}"
            )
            return result  # noqa: TRY300

        except (ValueError, TypeError, AttributeError) as e:
            error_message = f"Error deleting OAuth token: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class OAuthTokenRefreshWorkflow:
    """Workflow to refresh an OAuth token."""

    @workflow.run
    async def run(
        self, workflow_input: GetOAuthTokenInput
    ) -> SaveOAuthTokenOutput:
        """Refresh an OAuth token and update the database."""
        try:
            log.info(
                f"Refreshing OAuth token for user: {workflow_input.user_id}, server: {workflow_input.mcp_server_id}"
            )

            result = await workflow.step(
                function=oauth_token_refresh_and_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=60),
            )

            log.info(
                f"Successfully refreshed OAuth token for user: {workflow_input.user_id}, server: {workflow_input.mcp_server_id}"
            )
            return result  # noqa: TRY300

        except (ValueError, TypeError, AttributeError) as e:
            error_message = f"Error refreshing OAuth token: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class OAuthTokenSetDefaultWorkflow:
    """Workflow to set a token as default for its workspace and MCP server."""

    @workflow.run
    async def run(
        self, workflow_input: GetOAuthTokenInput
    ) -> dict[str, Any]:
        """Set a token as the default for its workspace and MCP server."""
        log.info(
            "OAuthTokenSetDefaultWorkflow started",
            workflow_input=workflow_input,
        )

        try:
            result = await workflow.step(
                function=oauth_token_set_default,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not result:
                log.error("Failed to set token as default")
                return {
                    "success": False,
                    "error": "Failed to set token as default",
                }

            log.info("Token set as default successfully")
            return {  # noqa: TRY300
                "success": True,
                "message": "Token set as default successfully",
                "token": result.token,
            }

        except (ValueError, TypeError, AttributeError) as e:
            error_message = (
                f"Error during set default token workflow: {e}"
            )
            log.error(error_message)
            return {"success": False, "error": error_message}


@workflow.defn()
class OAuthTokenSetDefaultByIdWorkflow:
    """Workflow to set a token as default for its workspace and MCP server by token ID."""

    @workflow.run
    async def run(
        self, workflow_input: SetDefaultTokenByIdInput
    ) -> dict[str, Any]:
        """Set a token as the default for its workspace and MCP server by token ID."""
        log.info(
            "OAuthTokenSetDefaultByIdWorkflow started",
            workflow_input=workflow_input,
        )

        try:
            result = await workflow.step(
                function=oauth_token_set_default_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not result:
                log.error("Failed to set token as default by ID")
                return {
                    "success": False,
                    "error": "Failed to set token as default by ID",
                }

            log.info("Token set as default by ID successfully")
            return {  # noqa: TRY300
                "success": True,
                "message": "Token set as default successfully",
                "token": result.token,
            }

        except (ValueError, TypeError, AttributeError) as e:
            error_message = f"Error during set default token by ID workflow: {e}"
            log.error(error_message)
            return {"success": False, "error": error_message}
