"""Create Metric with Optional Retroactive Evaluation Workflow.

Allows creating a new metric and immediately running it against historical traces.
"""

from dataclasses import dataclass
from typing import Any

from restack_ai.workflow import (
    ParentClosePolicy,
    import_functions,
    log,
    uuid,
    workflow,
)

from src.workflows.retroactive_metrics import (
    RetroactiveMetrics,
    RetroactiveMetricsInput,
)

with import_functions():
    from src.functions.metrics_crud import (
        create_metric_definition,
    )


@dataclass
class CreateMetricWithRetroactiveInput:
    """Input for creating metric with optional retroactive evaluation."""

    # Metric definition fields (required)
    workspace_id: str
    name: str
    category: str  # 'quality', 'performance', 'security', etc.
    metric_type: str  # 'llm_judge', 'python_code', 'formula'
    config: dict[str, Any]

    # Metric definition fields (optional)
    description: str | None = None
    is_active: bool = True
    created_by: str | None = None

    # Retroactive evaluation options (optional)
    run_retroactive: bool = False
    retroactive_date_from: str | None = (
        None  # ISO format datetime string
    )
    retroactive_date_to: str | None = (
        None  # ISO format datetime string
    )
    retroactive_sample_percentage: float | None = (
        None  # Y% of traces
    )
    retroactive_agent_id: str | None = (
        None  # Optional: specific agent
    )
    retroactive_agent_version: str | None = (
        None  # Optional: specific version
    )
    retroactive_max_traces: int | None = (
        None  # Optional: hard limit
    )


@dataclass
class CreateMetricWithRetroactiveOutput:
    """Output from metric creation with retroactive eval."""

    metric_id: str
    metric_name: str
    created: bool
    retroactive_evaluation: dict[str, Any] | None = None
    errors: list[str] | None = None


@workflow.defn()
class CreateMetricWithRetroactiveWorkflow:
    """Create a metric and optionally run retroactive evaluation.

    This workflow:
    1. Creates the metric definition
    2. If run_retroactive=True, starts RetroactiveMetrics
    3. Returns metric info and retroactive eval status

    Use cases:
    - Create a new quality metric and test it on historical data
    - Create a metric and sample traces to validate it works
    - Create and immediately evaluate without waiting for new tasks

    Note: Date ranges should be calculated by the caller and passed as ISO strings
    to maintain workflow determinism.
    """

    @workflow.run
    async def run(
        self, workflow_input: CreateMetricWithRetroactiveInput
    ) -> CreateMetricWithRetroactiveOutput:
        log.info(
            f"Creating metric: {workflow_input.name} with retroactive={workflow_input.run_retroactive}"
        )

        errors = []

        # Step 1: Create metric definition
        try:
            metric_result = await workflow.step(
                function=create_metric_definition,
                function_input={
                    "workspace_id": workflow_input.workspace_id,
                    "name": workflow_input.name,
                    "description": workflow_input.description,
                    "category": workflow_input.category,
                    "metric_type": workflow_input.metric_type,
                    "config": workflow_input.config,
                    "is_active": workflow_input.is_active,
                    "created_by": workflow_input.created_by,
                },
            )

            if not metric_result or not metric_result.get("id"):
                error_msg = "Failed to create metric definition"
                log.error(error_msg)
                return CreateMetricWithRetroactiveOutput(
                    metric_id="",
                    metric_name=workflow_input.name,
                    created=False,
                    errors=[error_msg],
                )

            metric_id = str(metric_result["id"])
            log.info(f"Metric created: {metric_id}")

        except Exception as e:
            error_msg = f"Error creating metric: {e}"
            log.error(error_msg)
            return CreateMetricWithRetroactiveOutput(
                metric_id="",
                metric_name=workflow_input.name,
                created=False,
                errors=[error_msg],
            )

        # Step 2: Run retroactive evaluation if requested
        retroactive_result = None
        if workflow_input.run_retroactive:
            try:
                log.info(
                    f"Starting retroactive evaluation for metric {metric_id}"
                )

                # Build filters based on input
                filters = {}

                if workflow_input.retroactive_agent_id:
                    filters["agent_id"] = (
                        workflow_input.retroactive_agent_id
                    )

                if workflow_input.retroactive_agent_version:
                    filters["agent_version"] = (
                        workflow_input.retroactive_agent_version
                    )

                # Add date range if provided
                if workflow_input.retroactive_date_from:
                    filters["date_from"] = (
                        workflow_input.retroactive_date_from
                    )
                if workflow_input.retroactive_date_to:
                    filters["date_to"] = (
                        workflow_input.retroactive_date_to
                    )

                # Start retroactive workflow as child (fire-and-forget)
                retroactive_workflow_id = (
                    f"retroactive_{metric_id}_{uuid()}"
                )

                await workflow.child_start(
                    workflow=RetroactiveMetrics,
                    workflow_input=RetroactiveMetricsInput(
                        workspace_id=workflow_input.workspace_id,
                        metric_definition_id=metric_id,
                        filters=filters,
                        batch_size=100,
                        max_traces=workflow_input.retroactive_max_traces,
                        sample_percentage=workflow_input.retroactive_sample_percentage,
                    ),
                    workflow_id=retroactive_workflow_id,
                    parent_close_policy=ParentClosePolicy.ABANDON,
                )

                retroactive_result = {
                    "workflow_id": retroactive_workflow_id,
                    "started": True,
                    "filters": filters,
                    "sample_percentage": workflow_input.retroactive_sample_percentage,
                    "max_traces": workflow_input.retroactive_max_traces,
                }

                log.info(
                    f"Retroactive evaluation started: {retroactive_workflow_id}"
                )

            except Exception as e:
                error_msg = (
                    f"Error starting retroactive evaluation: {e}"
                )
                log.error(error_msg)
                errors.append(error_msg)
                retroactive_result = {
                    "started": False,
                    "error": error_msg,
                }

        return CreateMetricWithRetroactiveOutput(
            metric_id=metric_id,
            metric_name=workflow_input.name,
            created=True,
            retroactive_evaluation=retroactive_result,
            errors=errors if errors else None,
        )
