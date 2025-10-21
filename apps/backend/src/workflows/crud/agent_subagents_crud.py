"""Workflows for agent subagents CRUD operations."""

from datetime import timedelta

from restack_ai.workflow import import_functions, log, workflow

with import_functions():
    from src.functions.agent_subagents_crud import (
        AgentSubagentsCreateInput,
        AgentSubagentsCreateOutput,
        AgentSubagentsDeleteInput,
        AgentSubagentsDeleteOutput,
        AgentSubagentsGetAvailableInput,
        AgentSubagentsGetAvailableOutput,
        AgentSubagentsReadInput,
        AgentSubagentsReadOutput,
        AgentSubagentsToggleInput,
        AgentSubagentsToggleOutput,
        agent_subagents_create,
        agent_subagents_delete,
        agent_subagents_get_available,
        agent_subagents_read,
        agent_subagents_toggle,
    )


@workflow.defn()
class AgentSubagentsReadWorkflow:
    """Workflow to read agent subagents."""

    @workflow.run
    async def run(
        self, workflow_input: AgentSubagentsReadInput
    ) -> AgentSubagentsReadOutput:
        """Execute the read agent subagents workflow."""
        log.debug(
            "AgentSubagentsReadWorkflow started",
            parent_agent_id=workflow_input.parent_agent_id,
        )

        result = await workflow.step(
            function=agent_subagents_read,
            function_input=workflow_input,
            start_to_close_timeout=timedelta(seconds=30),
        )

        log.debug("AgentSubagentsReadWorkflow completed")
        return result


@workflow.defn()
class AgentSubagentsGetAvailableWorkflow:
    """Workflow to get available subagents."""

    @workflow.run
    async def run(
        self, workflow_input: AgentSubagentsGetAvailableInput
    ) -> AgentSubagentsGetAvailableOutput:
        """Execute the get available agents workflow."""
        log.debug(
            "AgentSubagentsGetAvailableWorkflow started",
            workspace_id=workflow_input.workspace_id,
        )

        result = await workflow.step(
            function=agent_subagents_get_available,
            function_input=workflow_input,
            start_to_close_timeout=timedelta(seconds=30),
        )

        log.debug("AgentSubagentsGetAvailableWorkflow completed")
        return result


@workflow.defn()
class AgentSubagentsCreateWorkflow:
    """Workflow to create agent subagent relationship."""

    @workflow.run
    async def run(
        self, workflow_input: AgentSubagentsCreateInput
    ) -> AgentSubagentsCreateOutput:
        """Execute the create agent subagent workflow."""
        log.debug(
            "AgentSubagentsCreateWorkflow started",
            parent_agent_id=workflow_input.parent_agent_id,
            subagent_id=workflow_input.subagent_id,
        )

        result = await workflow.step(
            function=agent_subagents_create,
            function_input=workflow_input,
            start_to_close_timeout=timedelta(seconds=30),
        )

        log.debug("AgentSubagentsCreateWorkflow completed")
        return result


@workflow.defn()
class AgentSubagentsDeleteWorkflow:
    """Workflow to delete agent subagent relationship."""

    @workflow.run
    async def run(
        self, workflow_input: AgentSubagentsDeleteInput
    ) -> AgentSubagentsDeleteOutput:
        """Execute the delete agent subagent workflow."""
        log.debug(
            "AgentSubagentsDeleteWorkflow started",
            parent_agent_id=workflow_input.parent_agent_id,
            subagent_id=workflow_input.subagent_id,
        )

        result = await workflow.step(
            function=agent_subagents_delete,
            function_input=workflow_input,
            start_to_close_timeout=timedelta(seconds=30),
        )

        log.info("AgentSubagentsDeleteWorkflow completed")
        return result


@workflow.defn()
class AgentSubagentsToggleWorkflow:
    """Workflow to toggle agent subagent relationship."""

    @workflow.run
    async def run(
        self, workflow_input: AgentSubagentsToggleInput
    ) -> AgentSubagentsToggleOutput:
        """Execute the toggle agent subagent workflow."""
        log.debug(
            "AgentSubagentsToggleWorkflow started",
            parent_agent_id=workflow_input.parent_agent_id,
            subagent_id=workflow_input.subagent_id,
            enabled=workflow_input.enabled,
        )

        result = await workflow.step(
            function=agent_subagents_toggle,
            function_input=workflow_input,
            start_to_close_timeout=timedelta(seconds=30),
        )

        log.info("AgentSubagentsToggleWorkflow completed")
        return result
