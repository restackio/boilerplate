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
        McpToolsDiscoverInput,
        McpToolsDiscoverOutput,
        McpToolsListDirectInput,
        McpToolsListInput,
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
    """Simple workflow to discover tools from an MCP server URL."""

    @workflow.run
    async def run(
        self, workflow_input: McpToolsDiscoverInput
    ) -> McpToolsDiscoverOutput:
        try:
            # First, always try initialization to check if session is needed
            log.info(
                "Attempting MCP initialization to check session requirements"
            )
            session_init_result = await workflow.step(
                function=mcp_session_init,
                function_input=McpSessionInitInput(
                    server_url=workflow_input.server_url,
                    headers=workflow_input.headers,
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
                    function_input=McpToolsListInput(
                        mcp_endpoint=session_init_result.mcp_endpoint
                        or workflow_input.server_url,
                        session_id=session_init_result.session_id,
                        headers=workflow_input.headers,
                    ),
                    start_to_close_timeout=timedelta(seconds=30),
                )

                if not tools_list_result.success:
                    log.error(
                        f"Session-based tools list retrieval failed: {tools_list_result.error}"
                    )
                    return McpToolsDiscoverOutput(
                        success=False,
                        tools_discovered=[],
                        error=tools_list_result.error,
                    )

                return McpToolsDiscoverOutput(
                    success=True,
                    tools_discovered=tools_list_result.tools,
                )
            log.info(
                "Server does not require session management, using direct tool listing"
            )
            # Use direct tool listing (no session required)
            direct_result = await workflow.step(
                function=mcp_tools_list_direct,
                function_input=McpToolsListDirectInput(
                    server_url=workflow_input.server_url,
                    headers=workflow_input.headers,
                ),
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not direct_result.success:
                log.error(
                    f"Direct tools list retrieval failed: {direct_result.error}"
                )
                return McpToolsDiscoverOutput(
                    success=False,
                    tools_discovered=[],
                    error=direct_result.error,
                )

            return McpToolsDiscoverOutput(
                success=True, tools_discovered=direct_result.tools
            )

        except Exception as e:  # noqa: BLE001
            error_message = (
                f"Error during mcp_tools_list workflow: {e}"
            )
            log.error(error_message)
            return McpToolsDiscoverOutput(
                success=False,
                tools_discovered=[],
                error=error_message,
            )
