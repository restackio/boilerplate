"""Analytics Metrics Workflow.

Single workflow for all analytics metrics - faster and more efficient.
"""

from dataclasses import dataclass
from datetime import timedelta

from restack_ai.workflow import import_functions, log, workflow

with import_functions():
    from src.functions.analytics_metrics import (
        get_analytics_metrics,
    )


@dataclass
class AnalyticsInput:
    """Input for analytics workflow."""

    workspace_id: str
    agent_id: str | None = None
    version: str | None = None
    date_range: str = "7d"  # 1d, 7d, 30d, 90d
    metric_types: list[str] | str = (
        "all"  # ["performance", "quality", "overview"] or "all"
    )


@workflow.defn()
class GetAnalyticsMetrics:
    """Fetches analytics metrics - performance, quality, and overview data."""

    @workflow.run
    async def run(self, workflow_input: AnalyticsInput) -> dict:
        log.info(
            f"Fetching analytics for workspace {workflow_input.workspace_id}, "
            f"types: {workflow_input.metric_types}"
        )

        try:
            result = await workflow.step(
                function=get_analytics_metrics,
                function_input={
                    "workspace_id": workflow_input.workspace_id,
                    "agent_id": workflow_input.agent_id,
                    "version": workflow_input.version,
                    "date_range": workflow_input.date_range,
                    "metric_types": workflow_input.metric_types,
                },
                start_to_close_timeout=timedelta(seconds=15),
            )

            return {"success": True, "data": result}
        except Exception as e:
            error_message = f"Error fetching analytics: {e}"
            log.error(error_message)
            return {
                "success": False,
                "data": {
                    "performance": {
                        "summary": {},
                        "timeseries": [],
                    },
                    "quality": {"summary": [], "timeseries": []},
                    "overview": {"timeseries": []},
                },
                "error": str(e),
            }
