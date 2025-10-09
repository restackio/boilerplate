"""Feedback Submission Workflow.

Workflow for submitting and retrieving user feedback on agent responses.
"""

from restack_ai.workflow import import_functions, workflow

with import_functions():
    from src.functions.feedback_metrics import (
        GetFeedbackAnalyticsInput,
        GetTaskFeedbackInput,
        IngestFeedbackMetricInput,
        get_detailed_feedbacks,
        get_feedback_analytics,
        get_task_feedback,
        ingest_feedback_metric,
    )


@workflow.defn(name="FeedbackSubmissionWorkflow")
class FeedbackSubmissionWorkflow:
    @workflow.run
    async def run(
        self, input_data: IngestFeedbackMetricInput
    ) -> dict:
        """Submit user feedback on an agent response.

        Args:
            input_data: IngestFeedbackMetricInput with:
                - task_id: str
                - agent_id: str
                - workspace_id: str
                - response_id: str
                - response_index: int
                - message_count: int
                - feedback_type: str ('positive' or 'negative')
                - feedback_text: str | None (optional detailed feedback)
                - user_id: str | None (optional)
                - trace_id: str | None (optional)
                - span_id: str | None (optional)

        Returns:
            Dictionary with success status
        """
        # Save feedback to ClickHouse
        success = await workflow.step(
            function=ingest_feedback_metric,
            function_input=input_data,
        )

        return {
            "success": success,
            "task_id": input_data.task_id,
            "response_id": input_data.response_id,
            "feedback_type": input_data.feedback_type,
        }


@workflow.defn(name="GetTaskFeedbackWorkflow")
class GetTaskFeedbackWorkflow:
    @workflow.run
    async def run(self, input_data: GetTaskFeedbackInput) -> dict:
        """Get all feedback for a specific task.

        Args:
            input_data: GetTaskFeedbackInput with:
                - task_id: str

        Returns:
            List of feedback records
        """
        feedbacks = await workflow.step(
            function=get_task_feedback,
            function_input=input_data,
        )

        return {
            "task_id": input_data.task_id,
            "feedbacks": feedbacks,
            "count": len(feedbacks),
        }


@workflow.defn(name="GetFeedbackAnalyticsWorkflow")
class GetFeedbackAnalyticsWorkflow:
    @workflow.run
    async def run(
        self, input_data: GetFeedbackAnalyticsInput
    ) -> dict:
        """Get feedback analytics for a workspace.

        Args:
            input_data: GetFeedbackAnalyticsInput with:
                - workspace_id: str
                - agent_id: str | None (optional)
                - date_range: str (optional, defaults to '7d')

        Returns:
            Dictionary with timeseries and summary data
        """
        return await workflow.step(
            function=get_feedback_analytics,
            function_input=input_data,
        )


@workflow.defn(name="GetDetailedFeedbacksWorkflow")
class GetDetailedFeedbacksWorkflow:
    @workflow.run
    async def run(
        self, input_data: GetFeedbackAnalyticsInput
    ) -> list:
        """Get detailed list of all feedbacks with task links.

        Args:
            input_data: GetFeedbackAnalyticsInput with:
                - workspace_id: str
                - agent_id: str | None (optional)
                - date_range: str (optional, defaults to '7d')

        Returns:
            List of detailed feedback records
        """
        feedbacks = await workflow.step(
            function=get_detailed_feedbacks,
            function_input=input_data,
        )

        return {
            "feedbacks": feedbacks,
            "count": len(feedbacks),
        }
