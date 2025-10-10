"""Get Task Metrics Workflow.

Fetches all metrics (quality, performance, etc.) for a specific task from ClickHouse (supports real-time polling).
"""

from dataclasses import dataclass
from datetime import timedelta

from restack_ai.workflow import (
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.task_metrics_crud import (
        get_task_metrics_clickhouse,
    )


@dataclass
class GetTaskMetricsInput:
    task_id: str


@workflow.defn()
class GetTaskMetricsWorkflow:
    """Fetch all metric results for a task from ClickHouse."""

    @workflow.run
    async def run(
        self, workflow_input: GetTaskMetricsInput
    ) -> dict:
        log.info("GetTaskMetricsWorkflow started")

        try:
            result = await workflow.step(
                function=get_task_metrics_clickhouse,
                function_input={
                    "task_id": workflow_input.task_id
                },
                start_to_close_timeout=timedelta(seconds=10),
            )

        except (ValueError, TypeError, RuntimeError, AttributeError, ConnectionError, OSError) as e:
            error_message = f"Error getting task metrics: {e}"
            log.error(error_message)
            return {"success": False, "data": [], "error": str(e)}
        else:
            return {"success": True, "data": result}
