"""Workflows for Slack installation and channel-agent CRUD operations."""

from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.slack_crud import (
        DeleteOutput,
        SlackChannelAgentCreateInput,
        SlackChannelAgentDeleteInput,
        SlackChannelAgentListOutput,
        SlackChannelAgentLookupInput,
        SlackChannelAgentsByInstallationInput,
        SlackChannelAgentSingleOutput,
        SlackInstallationByTeamInput,
        SlackInstallationByWorkspaceInput,
        SlackInstallationCreateInput,
        SlackInstallationListOutput,
        SlackInstallationSingleOutput,
        SlackRoutingResult,
        slack_channel_agent_create,
        slack_channel_agent_delete,
        slack_channel_agents_by_installation,
        slack_installation_delete,
        slack_installation_get_by_team,
        slack_installation_upsert,
        slack_installations_by_workspace,
        slack_route_event,
    )


@workflow.defn()
class SlackInstallationUpsertWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: SlackInstallationCreateInput
    ) -> SlackInstallationSingleOutput:
        log.info("SlackInstallationUpsertWorkflow started")
        try:
            return await workflow.step(
                function=slack_installation_upsert,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in slack_installation_upsert: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class SlackInstallationGetByTeamWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: SlackInstallationByTeamInput
    ) -> SlackInstallationSingleOutput:
        log.info("SlackInstallationGetByTeamWorkflow started")
        try:
            return await workflow.step(
                function=slack_installation_get_by_team,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in slack_installation_get_by_team: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class SlackInstallationsByWorkspaceWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: SlackInstallationByWorkspaceInput
    ) -> SlackInstallationListOutput:
        log.info("SlackInstallationsByWorkspaceWorkflow started")
        try:
            return await workflow.step(
                function=slack_installations_by_workspace,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in slack_installations_by_workspace: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class SlackInstallationDeleteWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: SlackInstallationByTeamInput
    ) -> DeleteOutput:
        log.info("SlackInstallationDeleteWorkflow started")
        try:
            return await workflow.step(
                function=slack_installation_delete,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in slack_installation_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class SlackChannelAgentCreateWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: SlackChannelAgentCreateInput
    ) -> SlackChannelAgentSingleOutput:
        log.info("SlackChannelAgentCreateWorkflow started")
        try:
            return await workflow.step(
                function=slack_channel_agent_create,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in slack_channel_agent_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class SlackChannelAgentDeleteWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: SlackChannelAgentDeleteInput
    ) -> DeleteOutput:
        log.info("SlackChannelAgentDeleteWorkflow started")
        try:
            return await workflow.step(
                function=slack_channel_agent_delete,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in slack_channel_agent_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class SlackChannelAgentsByInstallationWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: SlackChannelAgentsByInstallationInput
    ) -> SlackChannelAgentListOutput:
        log.info("SlackChannelAgentsByInstallationWorkflow started")
        try:
            return await workflow.step(
                function=slack_channel_agents_by_installation,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error in slack_channel_agents_by_installation: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class SlackRouteEventWorkflow:
    @workflow.run
    async def run(
        self, workflow_input: SlackChannelAgentLookupInput
    ) -> SlackRoutingResult:
        log.info("SlackRouteEventWorkflow started")
        try:
            return await workflow.step(
                function=slack_route_event,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=10),
            )
        except Exception as e:
            error_message = f"Error in slack_route_event: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
