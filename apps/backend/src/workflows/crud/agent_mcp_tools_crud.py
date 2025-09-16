"""Workflows for agent-level MCP tool management."""

from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.agent_mcp_tools_crud import (
        AgentMcpToolCreateInput,
        AgentMcpToolUpdateInput,
        AgentMcpToolDeleteInput,
        AgentMcpToolsByAgentInput,
        AgentMcpToolListInput,
        AgentMcpToolSingleOutput,
        AgentMcpToolListOutput,
        AgentMcpToolDeleteOutput,
        agent_mcp_tools_create,
        agent_mcp_tools_read_by_agent,
        agent_mcp_tools_update,
        agent_mcp_tools_delete,
        agent_mcp_tools_list,
    )


@workflow.defn()
class AgentMcpToolsCreateWorkflow:
    """Workflow to create an agent MCP tool."""

    @workflow.run
    async def run(
        self, workflow_input: AgentMcpToolCreateInput
    ) -> AgentMcpToolSingleOutput:
        log.info("AgentMcpToolsCreateWorkflow started")
        try:
            return await workflow.step(
                function=agent_mcp_tools_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during agent_mcp_tools_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentMcpToolsReadByAgentWorkflow:
    """Workflow to read agent MCP tools by agent ID."""

    @workflow.run
    async def run(
        self, workflow_input: AgentMcpToolsByAgentInput
    ) -> AgentMcpToolListOutput:
        log.info("AgentMcpToolsReadByAgentWorkflow started")
        try:
            return await workflow.step(
                function=agent_mcp_tools_read_by_agent,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during agent_mcp_tools_read_by_agent: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentMcpToolsUpdateWorkflow:
    """Workflow to update an agent MCP tool."""

    @workflow.run
    async def run(
        self, workflow_input: AgentMcpToolUpdateInput
    ) -> AgentMcpToolSingleOutput:
        log.info("AgentMcpToolsUpdateWorkflow started")
        try:
            return await workflow.step(
                function=agent_mcp_tools_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during agent_mcp_tools_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentMcpToolsDeleteWorkflow:
    """Workflow to delete an agent MCP tool."""

    @workflow.run
    async def run(
        self, workflow_input: AgentMcpToolDeleteInput
    ) -> AgentMcpToolDeleteOutput:
        log.info("AgentMcpToolsDeleteWorkflow started")
        try:
            return await workflow.step(
                function=agent_mcp_tools_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during agent_mcp_tools_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentMcpToolsListWorkflow:
    """Workflow to list available tools from an MCP server."""

    @workflow.run
    async def run(
        self, workflow_input: AgentMcpToolListInput
    ) -> AgentMcpToolListOutput:
        log.info("AgentMcpToolsListWorkflow started")
        try:
            return await workflow.step(
                function=agent_mcp_tools_list,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=60),  # Longer timeout for list
            )
        except Exception as e:
            error_message = f"Error during agent_mcp_tools_list: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


