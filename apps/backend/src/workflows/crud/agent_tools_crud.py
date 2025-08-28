from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.agent_tools_crud import (
        AgentToolCreateInput,
        AgentToolDeleteOutput,
        AgentToolIdInput,
        AgentToolListOutput,
        AgentToolsGetByAgentInput,
        AgentToolSingleOutput,
        AgentToolsOutput,
        AgentToolUpdateInput,
        agent_tools_create,
        agent_tools_delete,
        agent_tools_read_by_agent,
        agent_tools_read_records_by_agent,
        agent_tools_update,
    )


@workflow.defn()
class AgentToolsReadByAgentWorkflow:
    """Workflow to read agent tools by agent ID."""

    @workflow.run
    async def run(self, workflow_input: AgentToolsGetByAgentInput) -> AgentToolsOutput:
        log.info("AgentToolsReadByAgentWorkflow started")
        try:
            return await workflow.step(
                function=agent_tools_read_by_agent,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during agent_tools_read_by_agent: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentToolsReadRecordsByAgentWorkflow:
    """Workflow to read agent tools records by agent ID."""

    @workflow.run
    async def run(self, workflow_input: AgentToolsGetByAgentInput) -> AgentToolListOutput:
        log.info("AgentToolsReadRecordsByAgentWorkflow started")
        try:
            return await workflow.step(
                function=agent_tools_read_records_by_agent,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during agent_tools_read_records_by_agent: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentToolsCreateWorkflow:
    """Workflow to create a new agent tool."""

    @workflow.run
    async def run(self, workflow_input: AgentToolCreateInput) -> AgentToolSingleOutput:
        log.info("AgentToolsCreateWorkflow started")
        try:
            return await workflow.step(
                function=agent_tools_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during agent_tools_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentToolsUpdateWorkflow:
    """Workflow to update an existing agent tool."""

    @workflow.run
    async def run(self, workflow_input: AgentToolUpdateInput) -> AgentToolSingleOutput:
        log.info("AgentToolsUpdateWorkflow started")
        try:
            return await workflow.step(
                function=agent_tools_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during agent_tools_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentToolsDeleteWorkflow:
    """Workflow to delete an agent tool."""

    @workflow.run
    async def run(self, workflow_input: AgentToolIdInput) -> AgentToolDeleteOutput:
        log.info("AgentToolsDeleteWorkflow started")
        try:
            return await workflow.step(
                function=agent_tools_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during agent_tools_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
