from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.user_workspaces_crud import (
        UserWorkspaceCreateInput,
        UserWorkspaceDeleteInput,
        UserWorkspaceDeleteOutput,
        UserWorkspaceListOutput,
        UserWorkspacesGetByUserInput,
        UserWorkspacesGetByWorkspaceInput,
        UserWorkspaceSingleOutput,
        UserWorkspaceUpdateInput,
        user_workspaces_create,
        user_workspaces_delete,
        user_workspaces_get_by_user,
        user_workspaces_get_by_workspace,
        user_workspaces_update,
    )


# Workflow definitions
@workflow.defn()
class UserWorkspacesGetByUserWorkflow:
    """Workflow to get all workspaces for a user."""

    @workflow.run
    async def run(
        self, workflow_input: UserWorkspacesGetByUserInput
    ) -> UserWorkspaceListOutput:
        log.info("UserWorkspacesGetByUserWorkflow started")
        try:
            return await workflow.step(
                function=user_workspaces_get_by_user,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during user_workspaces_get_by_user: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UserWorkspacesGetByWorkspaceWorkflow:
    """Workflow to get all users for a workspace."""

    @workflow.run
    async def run(
        self, workflow_input: UserWorkspacesGetByWorkspaceInput
    ) -> UserWorkspaceListOutput:
        log.info("UserWorkspacesGetByWorkspaceWorkflow started")
        try:
            return await workflow.step(
                function=user_workspaces_get_by_workspace,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during user_workspaces_get_by_workspace: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UserWorkspacesCreateWorkflow:
    """Workflow to add a user to an existing workspace.

    Note: This is for adding additional users/members to workspaces that already exist.
    When creating a NEW workspace, use WorkspacesCreateWorkflow with created_by_user_id instead.
    """

    @workflow.run
    async def run(
        self, workflow_input: UserWorkspaceCreateInput
    ) -> UserWorkspaceSingleOutput:
        log.info("UserWorkspacesCreateWorkflow started")
        try:
            return await workflow.step(
                function=user_workspaces_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during user_workspaces_create: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UserWorkspacesUpdateWorkflow:
    """Workflow to update user role in workspace."""

    @workflow.run
    async def run(
        self, workflow_input: UserWorkspaceUpdateInput
    ) -> UserWorkspaceSingleOutput:
        log.info("UserWorkspacesUpdateWorkflow started")
        try:
            return await workflow.step(
                function=user_workspaces_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during user_workspaces_update: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UserWorkspacesDeleteWorkflow:
    """Workflow to remove a user from a workspace."""

    @workflow.run
    async def run(
        self, workflow_input: UserWorkspaceDeleteInput
    ) -> UserWorkspaceDeleteOutput:
        log.info("UserWorkspacesDeleteWorkflow started")
        try:
            return await workflow.step(
                function=user_workspaces_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during user_workspaces_delete: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
