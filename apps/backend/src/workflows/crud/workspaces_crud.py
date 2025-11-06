from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.workspaces_crud import (
        WorkspaceCreateInput,
        WorkspaceDeleteOutput,
        WorkspaceIdInput,
        WorkspaceListOutput,
        WorkspaceReadInput,
        WorkspaceSingleOutput,
        WorkspaceUpdateInput,
        workspaces_create,
        workspaces_delete,
        workspaces_get_by_id,
        workspaces_read,
        workspaces_update,
    )


# Workflow definitions
@workflow.defn()
class WorkspacesReadWorkflow:
    """Workflow to read workspaces with optional user filtering."""

    @workflow.run
    async def run(
        self, workflow_input: WorkspaceReadInput
    ) -> WorkspaceListOutput:
        log.info("WorkspacesReadWorkflow started")
        try:
            return await workflow.step(
                function=workspaces_read,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during workspaces_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class WorkspacesCreateWorkflow:
    """Workflow to create a new workspace.

    If created_by_user_id is provided, the user will automatically be added as an owner.
    This is the recommended way to create workspaces with an initial owner.
    """

    @workflow.run
    async def run(
        self, workflow_input: WorkspaceCreateInput
    ) -> WorkspaceSingleOutput:
        log.info("WorkspacesCreateWorkflow started")
        try:
            return await workflow.step(
                function=workspaces_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during workspaces_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class WorkspacesUpdateWorkflow:
    """Workflow to update an existing workspace."""

    @workflow.run
    async def run(
        self, workflow_input: WorkspaceUpdateInput
    ) -> WorkspaceSingleOutput:
        log.info("WorkspacesUpdateWorkflow started")
        try:
            return await workflow.step(
                function=workspaces_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during workspaces_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class WorkspacesDeleteWorkflow:
    """Workflow to delete a workspace."""

    @workflow.run
    async def run(
        self, workflow_input: WorkspaceIdInput
    ) -> WorkspaceDeleteOutput:
        log.info("WorkspacesDeleteWorkflow started")
        try:
            return await workflow.step(
                function=workspaces_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during workspaces_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class WorkspacesGetByIdWorkflow:
    """Workflow to get a specific workspace by ID."""

    @workflow.run
    async def run(
        self, workflow_input: WorkspaceIdInput
    ) -> WorkspaceSingleOutput | None:
        log.info("WorkspacesGetByIdWorkflow started")
        try:
            return await workflow.step(
                function=workspaces_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during workspaces_get_by_id: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
