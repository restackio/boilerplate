"""Workflow wrapper for refreshing Slack channel-name snapshots.

Exposes ``slack_refresh_channel_names`` (in ``functions/slack_api.py``) as
a workflow the frontend can call when the user opens the Slack
integrations page. The activity itself does the per-channel
``conversations.info`` calls plus the DB UPDATEs; this workflow exists
purely so the call shape matches the rest of the
``executeWorkflow``-based frontend.
"""

from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.slack_api import (
        SlackRefreshChannelNamesInput,
        SlackRefreshChannelNamesOutput,
        slack_refresh_channel_names,
    )


@workflow.defn()
class SlackRefreshChannelNamesWorkflow:
    """Refresh cached display names for every channel under an integration.

    Bounded by ``_REFRESH_HARD_CAP`` and ``_REFRESH_CONCURRENCY`` in the
    activity to stay well under Slack's tier-3 rate limits even if the
    user opens the page repeatedly.
    """

    @workflow.run
    async def run(
        self, workflow_input: SlackRefreshChannelNamesInput
    ) -> SlackRefreshChannelNamesOutput:
        log.info("SlackRefreshChannelNamesWorkflow started")
        try:
            # Generous timeout: covers up to _REFRESH_HARD_CAP channels
            # at _REFRESH_CONCURRENCY in flight, each with ~10s HTTP
            # timeout, plus a buffer for the persistence step.
            return await workflow.step(
                function=slack_refresh_channel_names,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=120),
            )
        except Exception as e:
            error_message = (
                f"Error in slack_refresh_channel_names: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
