"""Workflows for polymorphic channel-integration and channel CRUD."""

from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.channels_crud import (
        ChannelConsumePendingWelcomeInput,
        ChannelConsumePendingWelcomeOutput,
        ChannelCreateInput,
        ChannelDeleteInput,
        ChannelIntegrationByExternalIdInput,
        ChannelIntegrationListOutput,
        ChannelIntegrationsByWorkspaceInput,
        ChannelIntegrationSingleOutput,
        ChannelIntegrationUpsertInput,
        ChannelListOutput,
        ChannelRouteEventInput,
        ChannelRouteResult,
        ChannelsByIntegrationInput,
        ChannelsByWorkspaceInput,
        ChannelSingleOutput,
        ChannelWithIntegrationListOutput,
        DeleteOutput,
        channel_consume_pending_welcome,
        channel_create,
        channel_delete,
        channel_integration_delete,
        channel_integration_get_by_external_id,
        channel_integration_upsert,
        channel_integrations_by_workspace,
        channel_route_event,
        channels_by_integration,
        channels_by_workspace,
    )


@workflow.defn()
class ChannelIntegrationUpsertWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: ChannelIntegrationUpsertInput
    ) -> ChannelIntegrationSingleOutput:
        log.info("ChannelIntegrationUpsertWorkflow started")
        try:
            return await workflow.step(
                function=channel_integration_upsert,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = (
                f"Error in channel_integration_upsert: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ChannelIntegrationGetByExternalIdWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: ChannelIntegrationByExternalIdInput
    ) -> ChannelIntegrationSingleOutput:
        log.info(
            "ChannelIntegrationGetByExternalIdWorkflow started"
        )
        try:
            return await workflow.step(
                function=channel_integration_get_by_external_id,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in channel_integration_get_by_external_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ChannelIntegrationsByWorkspaceWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: ChannelIntegrationsByWorkspaceInput
    ) -> ChannelIntegrationListOutput:
        log.info("ChannelIntegrationsByWorkspaceWorkflow started")
        try:
            return await workflow.step(
                function=channel_integrations_by_workspace,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = (
                f"Error in channel_integrations_by_workspace: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ChannelIntegrationDeleteWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: ChannelIntegrationByExternalIdInput
    ) -> DeleteOutput:
        log.info("ChannelIntegrationDeleteWorkflow started")
        try:
            return await workflow.step(
                function=channel_integration_delete,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = (
                f"Error in channel_integration_delete: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ChannelCreateWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: ChannelCreateInput
    ) -> ChannelSingleOutput:
        log.info("ChannelCreateWorkflow started")
        try:
            return await workflow.step(
                function=channel_create,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in channel_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ChannelDeleteWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: ChannelDeleteInput
    ) -> DeleteOutput:
        log.info("ChannelDeleteWorkflow started")
        try:
            return await workflow.step(
                function=channel_delete,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in channel_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ChannelsByIntegrationWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: ChannelsByIntegrationInput
    ) -> ChannelListOutput:
        log.info("ChannelsByIntegrationWorkflow started")
        try:
            return await workflow.step(
                function=channels_by_integration,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = (
                f"Error in channels_by_integration: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ChannelsByWorkspaceWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: ChannelsByWorkspaceInput
    ) -> ChannelWithIntegrationListOutput:
        log.info("ChannelsByWorkspaceWorkflow started")
        try:
            return await workflow.step(
                function=channels_by_workspace,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in channels_by_workspace: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ChannelRouteEventWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: ChannelRouteEventInput
    ) -> ChannelRouteResult:
        log.info("ChannelRouteEventWorkflow started")
        try:
            return await workflow.step(
                function=channel_route_event,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=10),
            )
        except Exception as e:
            error_message = f"Error in channel_route_event: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ChannelConsumePendingWelcomeWorkflow:
    """Pop the welcome_pending flag for a channel; returns names for rendering.

    Called by the slack-bot when ``member_joined_channel`` fires for our
    bot. Designed as a single round-trip so the listener can stay simple.
    """

    @workflow.run
    async def run(
        self, workflow_input: ChannelConsumePendingWelcomeInput
    ) -> ChannelConsumePendingWelcomeOutput:
        log.info("ChannelConsumePendingWelcomeWorkflow started")
        try:
            return await workflow.step(
                function=channel_consume_pending_welcome,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=15),
            )
        except Exception as e:
            error_message = (
                f"Error in channel_consume_pending_welcome: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
