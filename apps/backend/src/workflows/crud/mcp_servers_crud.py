from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    RetryPolicy,
    import_functions,
    log,
    workflow,
)

with import_functions():
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
    from src.functions.mcp_oauth_crud import (
        get_oauth_token_for_mcp_server,
        GetOAuthTokenForMcpServerInput,
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

        except Exception as e:
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

        except Exception as e:
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

        except Exception as e:
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

        except Exception as e:
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

        except Exception as e:
            error_message = (
                f"Error during mcp_servers_get_by_id: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class McpToolsListWorkflow:
    """Simple workflow to disclistover tools from an MCP server URL."""

    @workflow.run
    async def run(
        self, workflow_input: McpToolsListInput
    ) -> McpToolsListOutput:
        try:
            # Resolve server URL if it's a placeholder and we have mcp_server_id
            server_url = workflow_input.server_url
            if (server_url == "placeholder" and workflow_input.mcp_server_id):
                # Get the actual server URL from the MCP server record
                server_result = await workflow.step(
                    function=mcp_servers_get_by_id,
                    function_input=McpServerIdInput(
                        mcp_server_id=workflow_input.mcp_server_id
                    ),
                )
                if server_result.success and server_result.mcp_server:
                    server_url = server_result.mcp_server.server_url
                    log.info(f"Resolved server URL from MCP server: {server_url}")
                else:
                    raise NonRetryableError(
                        message=f"Could not resolve server URL for MCP server {workflow_input.mcp_server_id}"
                    )
            
            # Prepare headers with authentication if available
            headers = workflow_input.headers or {}

            # If workspace_id and mcp_server_id are provided, try to get default token
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
                        headers["Authorization"] = (
                            f"Bearer {token}"
                        )
                        log.info(
                            "Using default OAuth token for MCP server authentication"
                        )
                    else:
                        log.info(
                            "No default token found for MCP server"
                        )
                except Exception as e:
                    log.warning(
                        f"Failed to get OAuth token for MCP server: {e}"
                    )
            elif workflow_input.workspace_id:
                log.info(
                    "Workspace ID provided but no MCP server ID - cannot use default token authentication"
                )

            # First, always try initialization to check if session is needed
            log.info(
                "Attempting MCP initialization to check session requirements"
            )
            session_init_result = await workflow.step(
                function=mcp_session_init,
                function_input=McpSessionInitInput(
                    server_url=server_url,
                    headers=headers,
                    local=getattr(workflow_input, "local", False),
                ),
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=RetryPolicy(maximum_attempts=1),
            )

            # Check if server returned a session ID (indicates session is required)
            if session_init_result.session_id:
                log.info(
                    f"Server requires session management (session_id: {session_init_result.session_id})"
                )
                # Use session-based tool listing
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

                    # Check if it's an authentication error and suggest adding a token
                    error_message = tools_list_result.error or ""
                    if (
                        "401" in error_message
                        or "unauthorized" in error_message.lower()
                    ):
                        error_message = "Connection failed: Failed to get tools list: HTTP 401. Please add an authentication token for this integration."

                    return McpToolsListOutput(
                        success=False,
                        tools_list=[],
                        error=error_message,
                    )

                # Convert tools_with_descriptions to McpTool objects
                tools_with_desc = []
                if hasattr(tools_list_result, 'tools_with_descriptions'):
                    for tool_dict in tools_list_result.tools_with_descriptions:
                        tools_with_desc.append(McpTool(
                            name=tool_dict.get("name", ""),
                            description=tool_dict.get("description")
                        ))
                
                return McpToolsListOutput(
                    success=True,
                    tools_list=tools_list_result.tools,
                    tools=tools_with_desc,
                )
            log.info(
                "Server does not require session management, using direct tool listing"
            )
            # Use direct tool listing (no session required)
            direct_result = await workflow.step(
                function=mcp_tools_list_direct,
                function_input=McpToolsListDirectInput(
                    server_url=server_url,
                    headers=headers,
                    local=getattr(workflow_input, "local", False),
                ),
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not direct_result.success:
                log.error(
                    f"Direct tools list retrieval failed: {direct_result.error}"
                )

                # Check if it's an authentication error and suggest adding a token
                error_message = direct_result.error or ""
                if (
                    "401" in error_message
                    or "unauthorized" in error_message.lower()
                ):
                    error_message = "Connection failed: Failed to get tools list: HTTP 401. Please add an authentication token for this integration."

                return McpToolsListOutput(
                    success=False,
                    tools_list=[],
                    error=error_message,
                )

            # Convert tools_with_descriptions to McpTool objects for direct result
            tools_with_desc = []
            if hasattr(direct_result, 'tools_with_descriptions'):
                for tool_dict in direct_result.tools_with_descriptions:
                    tools_with_desc.append(McpTool(
                        name=tool_dict.get("name", ""),
                        description=tool_dict.get("description")
                    ))
            
            return McpToolsListOutput(
                success=True, 
                tools_list=direct_result.tools,
                tools=tools_with_desc,
            )

        except Exception as e:  # noqa: BLE001
            error_message = (
                f"Error during mcp_tools_list workflow: {e}"
            )
            log.error(error_message)
            return McpToolsListOutput(
                success=False,
                tools_list=[],
                error=error_message,
            )
