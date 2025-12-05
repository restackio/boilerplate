from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.teams_crud import (
        TeamCreateInput,
        TeamDeleteOutput,
        TeamGetByWorkspaceInput,
        TeamIdInput,
        TeamListOutput,
        TeamSingleOutput,
        TeamUpdateInput,
        teams_create,
        teams_delete,
        teams_get_by_id,
        teams_read,
        teams_update,
    )


# Workflow definitions
@workflow.defn()
class TeamsReadWorkflow:
    """Workflow to read all teams for a workspace."""

    @workflow.run
    async def run(
        self, workflow_input: TeamGetByWorkspaceInput
    ) -> TeamListOutput:
        log.info("TeamsReadWorkflow started")
        try:
            return await workflow.step(
                function=teams_read,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during teams_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TeamsCreateWorkflow:
    """Workflow to create a new team."""

    @workflow.run
    async def run(
        self, workflow_input: TeamCreateInput
    ) -> TeamSingleOutput:
        log.info("TeamsCreateWorkflow started")
        try:
            return await workflow.step(
                function=teams_create,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during teams_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TeamsUpdateWorkflow:
    """Workflow to update an existing team."""

    @workflow.run
    async def run(
        self, workflow_input: TeamUpdateInput
    ) -> TeamSingleOutput:
        log.info("TeamsUpdateWorkflow started")
        try:
            return await workflow.step(
                function=teams_update,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during teams_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TeamsDeleteWorkflow:
    """Workflow to delete a team."""

    @workflow.run
    async def run(
        self, workflow_input: TeamIdInput
    ) -> TeamDeleteOutput:
        log.info("TeamsDeleteWorkflow started")
        try:
            return await workflow.step(
                function=teams_delete,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during teams_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TeamsGetByIdWorkflow:
    """Workflow to get a team by ID."""

    @workflow.run
    async def run(
        self, workflow_input: TeamIdInput
    ) -> TeamSingleOutput:
        log.info("TeamsGetByIdWorkflow started")
        try:
            return await workflow.step(
                function=teams_get_by_id,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during teams_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
