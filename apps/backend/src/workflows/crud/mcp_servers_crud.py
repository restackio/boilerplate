from datetime import timedelta
from typing import Any

from restack_ai.workflow import (
    NonRetryableError,
    RetryPolicy,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.mcp_oauth_crud import (
        GetOAuthTokenForMcpServerInput,
        get_oauth_token_for_mcp_server,
    )
    from src.functions.mcp_servers_crud import (
        McpServerCreateInput,
        McpServerDeleteOutput,
        McpServerGetByWorkspaceInput,
        McpServerIdInput,
        McpServerListOutput,
        McpServerSingleOutput,
        McpServerUpdateInput,
        mcp_servers_create,
        mcp_servers_delete,
        mcp_servers_get_by_id,
        mcp_servers_read,
        mcp_servers_update,
    )
    from src.functions.mcp_tools_refresh import (
        McpSessionInitInput,
        McpTool,
        McpToolsListDirectInput,
        McpToolsListInput,
        McpToolsListOutput,
        McpToolsSessionInput,
        mcp_session_init,
        mcp_tools_list,
        mcp_tools_list_direct,
    )


@workflow.defn()
class McpServersReadWorkflow:
    """Workflow to read MCP servers by workspace."""

    @workflow.run
    async def run(
        self, workflow_input: McpServerGetByWorkspaceInput
    ) -> McpServerListOutput:
        log.info("McpServersReadWorkflow started")
        try:
            return await workflow.step(
                function=mcp_servers_read,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
            ConnectionError,
            OSError,
        ) as e:
            error_message = f"Error during mcp_servers_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class McpServersCreateWorkflow:
    """Workflow to create a new MCP server."""

    @workflow.run
    async def run(
        self, workflow_input: McpServerCreateInput
    ) -> McpServerSingleOutput:
        log.info("McpServersCreateWorkflow started")
        try:
            return await workflow.step(
                function=mcp_servers_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
            ConnectionError,
            OSError,
        ) as e:
            error_message = (
                f"Error during mcp_servers_create: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class McpServersUpdateWorkflow:
    """Workflow to update an existing MCP server."""

    @workflow.run
    async def run(
        self, workflow_input: McpServerUpdateInput
    ) -> McpServerSingleOutput:
        log.info("McpServersUpdateWorkflow started")
        try:
            return await workflow.step(
                function=mcp_servers_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
            ConnectionError,
            OSError,
        ) as e:
            error_message = (
                f"Error during mcp_servers_update: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class McpServersDeleteWorkflow:
    """Workflow to delete an MCP server."""

    @workflow.run
    async def run(
        self, workflow_input: McpServerIdInput
    ) -> McpServerDeleteOutput:
        log.info("McpServersDeleteWorkflow started")
        try:
            return await workflow.step(
                function=mcp_servers_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
            ConnectionError,
            OSError,
        ) as e:
            error_message = (
                f"Error during mcp_servers_delete: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class McpServersGetByIdWorkflow:
    """Workflow to get a specific MCP server by ID."""

    @workflow.run
    async def run(
        self, workflow_input: McpServerIdInput
    ) -> McpServerSingleOutput:
        log.info("McpServersGetByIdWorkflow started")
        try:
            return await workflow.step(
                function=mcp_servers_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
            ConnectionError,
            OSError,
        ) as e:
            error_message = (
                f"Error during mcp_servers_get_by_id: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class McpToolsListWorkflow:
    """Simple workflow to disclistover tools from an MCP server URL."""

    async def _resolve_server_info(
        self, workflow_input: McpToolsListInput
    ) -> tuple[str | None, bool, str | None]:
        """Resolve server URL and local flag. Returns (server_url, is_local, error)."""
        if (
            not workflow_input.server_url
            and not workflow_input.mcp_server_id
        ):
            return (
                None,
                False,
                "Either server_url or mcp_server_id must be provided",
            )

        server_url = workflow_input.server_url
        is_local = workflow_input.local

        if (
            server_url == "placeholder" or not server_url
        ) and workflow_input.mcp_server_id:
            server_result = await workflow.step(
                function=mcp_servers_get_by_id,
                function_input=McpServerIdInput(
                    mcp_server_id=workflow_input.mcp_server_id
                ),
            )
            if server_result and server_result.mcp_server:
                is_local = server_result.mcp_server.local
                server_url = server_result.mcp_server.server_url
                log.info(
                    f"Resolved MCP server - local: {is_local}, server_url: {server_url}"
                )
            else:
                return (
                    None,
                    False,
                    f"Could not resolve MCP server {workflow_input.mcp_server_id}",
                )

        if not server_url:
            return (
                None,
                False,
                "Either server_url or mcp_server_id must be provided",
            )

        return (server_url, is_local, None)

    async def _get_auth_headers(
        self, workflow_input: McpToolsListInput
    ) -> dict:
        """Get headers with OAuth token if available."""
        headers = workflow_input.headers or {}

        if (
            workflow_input.workspace_id
            and workflow_input.mcp_server_id
        ):
            try:
                token = await workflow.step(
                    function=get_oauth_token_for_mcp_server,
                    function_input=GetOAuthTokenForMcpServerInput(
                        mcp_server_id=workflow_input.mcp_server_id,
                        workspace_id=workflow_input.workspace_id,
                    ),
                )
                if token:
                    headers["Authorization"] = f"Bearer {token}"
                    log.info(
                        "Using default OAuth token for MCP server authentication"
                    )
                else:
                    log.info(
                        "No default token found for MCP server"
                    )
            except (ValueError, TypeError, AttributeError) as e:
                log.warning(
                    f"Failed to get OAuth token for MCP server: {e}"
                )
        elif workflow_input.workspace_id:
            log.info(
                "Workspace ID provided but no MCP server ID - cannot use default token authentication"
            )

        return headers

    def _convert_tools_to_mcp_objects(
        self, tools_with_descriptions: list
    ) -> list:
        """Convert tool dictionaries to McpTool objects."""
        return [
            McpTool(
                name=tool_dict.get("name", ""),
                description=tool_dict.get("description"),
            )
            for tool_dict in tools_with_descriptions
        ]

    def _enhance_auth_error(self, error_message: str) -> str:
        """Enhance error message for authentication failures."""
        if (
            "401" in error_message
            or "unauthorized" in error_message.lower()
        ):
            return "Connection failed: Failed to get tools list: HTTP 401. Please add an authentication token for this integration."
        return error_message

    async def _list_tools_with_session(
        self,
        session_init_result: Any,
        server_url: str,
        headers: dict,
    ) -> McpToolsListOutput:
        """List tools using session-based approach."""
        log.info(
            f"Server requires session management (session_id: {session_init_result.session_id})"
        )

        tools_list_result = await workflow.step(
            function=mcp_tools_list,
            function_input=McpToolsSessionInput(
                mcp_endpoint=session_init_result.mcp_endpoint
                or server_url,
                session_id=session_init_result.session_id,
                headers=headers,
            ),
            start_to_close_timeout=timedelta(seconds=30),
        )

        if not tools_list_result.success:
            log.error(
                f"Session-based tools list retrieval failed: {tools_list_result.error}"
            )
            error_message = self._enhance_auth_error(
                tools_list_result.error or ""
            )
            return McpToolsListOutput(
                success=False, tools_list=[], error=error_message
            )

        tools_with_desc = []
        if hasattr(tools_list_result, "tools_with_descriptions"):
            tools_with_desc = self._convert_tools_to_mcp_objects(
                tools_list_result.tools_with_descriptions
            )

        return McpToolsListOutput(
            success=True,
            tools_list=tools_list_result.tools,
            tools=tools_with_desc,
        )

    async def _list_tools_direct(
        self, server_url: str, headers: dict, *, is_local: bool
    ) -> McpToolsListOutput:
        """List tools using direct approach (no session)."""
        log.info(
            "Server does not require session management, using direct tool listing"
        )

        direct_result = await workflow.step(
            function=mcp_tools_list_direct,
            function_input=McpToolsListDirectInput(
                server_url=server_url,
                headers=headers,
                local=is_local,
            ),
            start_to_close_timeout=timedelta(seconds=30),
        )

        if not direct_result.success:
            log.error(
                f"Direct tools list retrieval failed: {direct_result.error}"
            )
            error_message = self._enhance_auth_error(
                direct_result.error or ""
            )
            return McpToolsListOutput(
                success=False, tools_list=[], error=error_message
            )

        tools_with_desc = []
        if hasattr(direct_result, "tools_with_descriptions"):
            tools_with_desc = self._convert_tools_to_mcp_objects(
                direct_result.tools_with_descriptions
            )

        return McpToolsListOutput(
            success=True,
            tools_list=direct_result.tools,
            tools=tools_with_desc,
        )

    @workflow.run
    async def run(
        self, workflow_input: McpToolsListInput
    ) -> McpToolsListOutput:
        try:
            # Step 1: Resolve server URL and local flag
            (
                server_url,
                is_local,
                error,
            ) = await self._resolve_server_info(workflow_input)
            if error:
                return McpToolsListOutput(
                    success=False, error=error
                )

            log.info(
                f"Listing tools for server - local: {is_local}, server_url: {server_url}"
            )

            # Step 2: Get authentication headers
            headers = await self._get_auth_headers(workflow_input)

            # Step 3: Initialize session to check if session management is needed
            log.info(
                "Attempting MCP initialization to check session requirements"
            )
            session_init_result = await workflow.step(
                function=mcp_session_init,
                function_input=McpSessionInitInput(
                    server_url=server_url or "",
                    headers=headers,
                    local=is_local,
                ),
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=RetryPolicy(maximum_attempts=1),
            )

            # Step 4: List tools (session-based or direct)
            if session_init_result.session_id:
                return await self._list_tools_with_session(
                    session_init_result, server_url, headers
                )
            return await self._list_tools_direct(
                server_url, headers, is_local
            )

        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
            ConnectionError,
            OSError,
        ) as e:
            error_message = (
                f"Error during mcp_tools_list workflow: {e}"
            )
            log.error(error_message)
            return McpToolsListOutput(
                success=False,
                tools_list=[],
                error=error_message,
            )
