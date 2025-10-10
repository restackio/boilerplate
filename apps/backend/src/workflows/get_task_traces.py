"""Get Task Traces Workflow.

Fetches all trace spans for a given task from ClickHouse.
"""

from dataclasses import dataclass

from restack_ai.workflow import import_functions, log, workflow

with import_functions():
    from src.functions.traces_crud import (
        get_task_traces_from_clickhouse,
    )


@dataclass
class GetTaskTracesInput:
    """Input for get task traces workflow."""

    task_id: str


@workflow.defn()
class GetTaskTracesWorkflow:
    """Fetches all trace spans for a task."""

    @workflow.run
    async def run(
        self, workflow_input: GetTaskTracesInput
    ) -> dict:
        log.info(
            f"Fetching traces for task {workflow_input.task_id}"
        )

        try:
            return await workflow.step(
                function=get_task_traces_from_clickhouse,
                function_input={
                    "task_id": workflow_input.task_id
                },
            )

        except (ValueError, TypeError, RuntimeError, AttributeError, ConnectionError, OSError) as e:
            error_message = f"Error fetching traces: {e}"
            log.error(error_message)
            return {
                "spans": [],
                "summary": {
                    "total_spans": 0,
                    "total_duration_ms": 0,
                    "total_tokens": 0,
                    "total_cost_usd": 0,
                    "response_spans": 0,
                    "function_spans": 0,
                },
                "error": str(e),
            }
