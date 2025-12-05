from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.users_crud import (
        UserCreateInput,
        UserDeleteOutput,
        UserEmailInput,
        UserIdInput,
        UserListOutput,
        UserSingleOutput,
        UserUpdateInput,
        UserWorkspaceIdInput,
        users_create,
        users_delete,
        users_get_by_email,
        users_get_by_id,
        users_get_by_workspace,
        users_read,
        users_update,
    )


# Workflow definitions
@workflow.defn()
class UsersReadWorkflow:
    """Workflow to read all users."""

    @workflow.run
    async def run(self, _workflow_input: dict) -> UserListOutput:
        log.info("UsersReadWorkflow started")
        try:
            return await workflow.step(
                function=users_read,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during users_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UsersCreateWorkflow:
    """Workflow to create a new user."""

    @workflow.run
    async def run(
        self, workflow_input: UserCreateInput
    ) -> UserSingleOutput:
        log.info("UsersCreateWorkflow started")
        try:
            return await workflow.step(
                function=users_create,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during users_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UsersUpdateWorkflow:
    """Workflow to update an existing user."""

    @workflow.run
    async def run(
        self, workflow_input: UserUpdateInput
    ) -> UserSingleOutput:
        log.info("UsersUpdateWorkflow started")
        try:
            return await workflow.step(
                function=users_update,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during users_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UsersDeleteWorkflow:
    """Workflow to delete a user."""

    @workflow.run
    async def run(
        self, workflow_input: UserIdInput
    ) -> UserDeleteOutput:
        log.info("UsersDeleteWorkflow started")
        try:
            return await workflow.step(
                function=users_delete,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during users_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UsersGetByIdWorkflow:
    """Workflow to get a specific user by ID."""

    @workflow.run
    async def run(
        self, workflow_input: UserIdInput
    ) -> UserSingleOutput | None:
        log.info("UsersGetByIdWorkflow started")
        try:
            return await workflow.step(
                function=users_get_by_id,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during users_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UsersGetByEmailWorkflow:
    """Workflow to get a specific user by email."""

    @workflow.run
    async def run(
        self, workflow_input: UserEmailInput
    ) -> UserSingleOutput | None:
        log.info("UsersGetByEmailWorkflow started")
        try:
            return await workflow.step(
                function=users_get_by_email,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during users_get_by_email: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UsersGetByWorkspaceWorkflow:
    """Workflow to get all users in a workspace."""

    @workflow.run
    async def run(
        self, workflow_input: UserWorkspaceIdInput
    ) -> UserListOutput:
        log.info("UsersGetByWorkspaceWorkflow started")
        try:
            return await workflow.step(
                function=users_get_by_workspace,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during users_get_by_workspace: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
