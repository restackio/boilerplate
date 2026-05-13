from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.workspace_invites_crud import (
        WorkspaceInviteActionOutput,
        WorkspaceInviteByIdInput,
        WorkspaceInviteByTokenInput,
        WorkspaceInviteCreateInput,
        WorkspaceInviteListOutput,
        WorkspaceInviteListPendingInput,
        workspace_invites_accept,
        workspace_invites_create,
        workspace_invites_decline,
        workspace_invites_get_by_token,
        workspace_invites_list_pending,
        workspace_invites_resend,
        workspace_invites_revoke,
    )


@workflow.defn()
class WorkspaceInvitesCreateWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: WorkspaceInviteCreateInput
    ) -> WorkspaceInviteActionOutput:
        log.info("WorkspaceInvitesCreateWorkflow started")
        try:
            return await workflow.step(
                function=workspace_invites_create,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Error during workspace_invites_create: {e}"
            ) from e


@workflow.defn()
class WorkspaceInvitesGetByTokenWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: WorkspaceInviteByTokenInput
    ) -> WorkspaceInviteActionOutput:
        log.info("WorkspaceInvitesGetByTokenWorkflow started")
        try:
            return await workflow.step(
                function=workspace_invites_get_by_token,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Error during workspace_invites_get_by_token: {e}"
            ) from e


@workflow.defn()
class WorkspaceInvitesAcceptWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: WorkspaceInviteByTokenInput
    ) -> WorkspaceInviteActionOutput:
        log.info("WorkspaceInvitesAcceptWorkflow started")
        try:
            return await workflow.step(
                function=workspace_invites_accept,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Error during workspace_invites_accept: {e}"
            ) from e


@workflow.defn()
class WorkspaceInvitesDeclineWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: WorkspaceInviteByTokenInput
    ) -> WorkspaceInviteActionOutput:
        log.info("WorkspaceInvitesDeclineWorkflow started")
        try:
            return await workflow.step(
                function=workspace_invites_decline,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Error during workspace_invites_decline: {e}"
            ) from e


@workflow.defn()
class WorkspaceInvitesListPendingWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: WorkspaceInviteListPendingInput
    ) -> WorkspaceInviteListOutput:
        log.info("WorkspaceInvitesListPendingWorkflow started")
        try:
            return await workflow.step(
                function=workspace_invites_list_pending,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Error during workspace_invites_list_pending: {e}"
            ) from e


@workflow.defn()
class WorkspaceInvitesRevokeWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: WorkspaceInviteByIdInput
    ) -> WorkspaceInviteActionOutput:
        log.info("WorkspaceInvitesRevokeWorkflow started")
        try:
            return await workflow.step(
                function=workspace_invites_revoke,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Error during workspace_invites_revoke: {e}"
            ) from e


@workflow.defn()
class WorkspaceInvitesResendWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: WorkspaceInviteByIdInput
    ) -> WorkspaceInviteActionOutput:
        log.info("WorkspaceInvitesResendWorkflow started")
        try:
            return await workflow.step(
                function=workspace_invites_resend,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Error during workspace_invites_resend: {e}"
            ) from e
