"""Workflows for querying tasks by metric failures."""

from dataclasses import dataclass
from datetime import timedelta

from restack_ai.workflow import import_functions, log, workflow

with import_functions():
    from src.functions.tasks_by_metrics import (
        TasksByFeedbackInput,
        TasksByMetricInput,
        get_tasks_by_feedback,
        get_tasks_by_metric_failure,
    )


@dataclass
class TasksByMetricWorkflowInput:
    """Input for TasksByMetricWorkflow."""

    workspace_id: str
    metric_name: str
    status: str = "failed"
    agent_id: str | None = None
    version: str | None = None
    date_range: str = "7d"


@dataclass
class TasksByFeedbackWorkflowInput:
    """Input for TasksByFeedbackWorkflow."""

    workspace_id: str
    feedback_type: str = "negative"
    agent_id: str | None = None
    version: str | None = None
    date_range: str = "7d"


@workflow.defn()
class GetTasksByMetricWorkflow:
    """Workflow to get task IDs that failed/passed a specific metric."""

    @workflow.run
    async def run(self, workflow_input: TasksByMetricWorkflowInput) -> dict:
        log.info(
            f"Getting tasks that {workflow_input.status} metric "
            f"'{workflow_input.metric_name}' in workspace {workflow_input.workspace_id}"
        )

        try:
            result = await workflow.step(
                function=get_tasks_by_metric_failure,
                function_input=TasksByMetricInput(
                    workspace_id=workflow_input.workspace_id,
                    metric_name=workflow_input.metric_name,
                    status=workflow_input.status,
                    agent_id=workflow_input.agent_id,
                    version=workflow_input.version,
                    date_range=workflow_input.date_range,
                ),
                start_to_close_timeout=timedelta(seconds=10),
            )

            return {
                "success": True,
                "task_ids": result.task_ids,
                "count": result.count,
            }
        except Exception as e:
            error_message = f"Error getting tasks by metric: {e}"
            log.error(error_message)
            return {
                "success": False,
                "error": str(e),
                "task_ids": [],
                "count": 0,
            }


@workflow.defn()
class GetTasksByFeedbackWorkflow:
    """Workflow to get task IDs with specific feedback."""

    @workflow.run
    async def run(self, workflow_input: TasksByFeedbackWorkflowInput) -> dict:
        log.info(
            f"Getting tasks with {workflow_input.feedback_type} feedback "
            f"in workspace {workflow_input.workspace_id}"
        )

        try:
            result = await workflow.step(
                function=get_tasks_by_feedback,
                function_input=TasksByFeedbackInput(
                    workspace_id=workflow_input.workspace_id,
                    feedback_type=workflow_input.feedback_type,
                    agent_id=workflow_input.agent_id,
                    version=workflow_input.version,
                    date_range=workflow_input.date_range,
                ),
                start_to_close_timeout=timedelta(seconds=10),
            )

            return {
                "success": True,
                "task_ids": result.task_ids,
                "count": result.count,
            }
        except Exception as e:
            error_message = f"Error getting tasks by feedback: {e}"
            log.error(error_message)
            return {
                "success": False,
                "error": str(e),
                "task_ids": [],
                "count": 0,
            }

