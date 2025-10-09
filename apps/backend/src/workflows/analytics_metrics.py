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
    from src.functions.metrics_crud import (
        ListMetricDefinitionsInput,
        list_metric_definitions,
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
            # Step 1: Fetch active metric definitions
            metric_definitions = await workflow.step(
                function=list_metric_definitions,
                function_input=ListMetricDefinitionsInput(
                    workspace_id=workflow_input.workspace_id,
                    is_active=True,  # Only active metrics
                    category="quality",  # Only quality metrics for now
                ),
                start_to_close_timeout=timedelta(seconds=10),
            )

            # Step 2: Fetch actual metric results from ClickHouse
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

            # Step 3: Merge metric definitions with results
            if "quality" in result and metric_definitions:
                result["quality"] = _merge_quality_metrics(
                    metric_definitions, result["quality"]
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


def _merge_quality_metrics(
    definitions: list[dict], quality_data: dict
) -> dict:
    """Merge metric definitions with actual results.

    Ensures all active quality metrics appear in the summary,
    even if they have no evaluation data yet. Also enriches with metric_id and is_default.
    """
    existing_summary = quality_data.get("summary", [])

    # Create a lookup map from definitions for enrichment
    definitions_map = {d["name"]: d for d in definitions}

    # Enrich existing summary items with metric_id and is_default
    enriched_summary = []
    existing_names = set()

    for metric in existing_summary:
        metric_name = metric["metricName"]
        existing_names.add(metric_name)

        # Add metric_id, is_default, is_active, and config from definitions
        if metric_name in definitions_map:
            definition = definitions_map[metric_name]
            metric["metricId"] = definition["id"]
            metric["isDefault"] = definition.get("is_default", False)
            metric["isActive"] = definition.get("is_active", True)
            metric["config"] = definition.get("config", {})

        enriched_summary.append(metric)

    # Add metrics that don't have data yet
    for definition in definitions:
        metric_name = definition["name"]
        if metric_name not in existing_names:
            # Add metric with empty data
            enriched_summary.append({
                "metricName": metric_name,
                "metricId": definition["id"],
                "isDefault": definition.get("is_default", False),
                "isActive": definition.get("is_active", True),
                "config": definition.get("config", {}),
                "passRate": 0,
                "avgScore": None,
                "evaluationCount": 0,
            })

    return {
        "summary": enriched_summary,
        "timeseries": quality_data.get("timeseries", []),
    }
