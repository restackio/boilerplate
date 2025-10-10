"""Task Metrics Workflow.

Evaluates task performance and runs quality metrics in parallel.
"""

import asyncio
from dataclasses import dataclass

from restack_ai.workflow import import_functions, log, workflow

with import_functions():
    from src.functions.metrics_crud import list_metric_definitions
    from src.functions.metrics_evaluation import (
        ingest_performance_metrics,
        ingest_quality_metrics,
    )
    from src.functions.metrics_helpers import (
        build_performance_data_dict,
        create_metric_evaluation_task,
    )


@dataclass
class TaskMetricsInput:
    """Input for task metrics workflow - supports both task-level and response-level metrics."""

    task_id: str
    agent_id: str
    agent_name: str
    parent_agent_id: str | None
    workspace_id: str
    agent_version: str

    # Task data
    task_input: str
    task_output: str

    # Performance data (already captured during execution)
    duration_ms: int
    input_tokens: int
    output_tokens: int
    status: str  # completed, failed

    # Response tracking (new! for continuous metrics)
    response_id: str | None = (
        None  # OpenAI response ID (resp_xxx)
    )
    response_index: int | None = (
        None  # Which response in conversation (1, 2, 3...)
    )
    message_count: int | None = (
        None  # Total messages in conversation so far
    )

    # Options
    run_quality_metrics: bool = True


@dataclass
class MetricEvaluationResult:
    """Result of a single metric evaluation."""

    metric_definition_id: str
    metric_name: str
    metric_type: str
    passed: bool
    score: float | None  # Optional score 0-100 (advanced feature)
    reasoning: str | None
    eval_duration_ms: int
    eval_cost_usd: float


@dataclass
class TaskMetricsOutput:
    """Output of task metrics workflow."""

    task_id: str
    performance_saved: bool
    quality_metrics_count: int
    quality_metrics_results: list[MetricEvaluationResult]
    total_duration_ms: int
    errors: list[str]


@workflow.defn()
class TaskMetricsWorkflow:
    """Workflow for task metrics evaluation.

    1. Saves performance metrics (speed, tokens, cost)
    2. Fetches all active metric definitions from the database (global workspace metrics)
    3. Runs quality metrics in PARALLEL (LLM judges, code, formulas)
    4. Saves all results to ClickHouse.

    Note: Uses global workspace metrics - all active metrics apply to all tasks.
    """

    async def _query_traces(
        self, workflow_input: TaskMetricsInput
    ) -> dict | None:
        """Query traces for this response. Returns trace_result or None if not found."""
        try:
            from src.functions.traces_query import (
                query_traces_for_response,
            )

            trace_result = await workflow.step(
                function=query_traces_for_response,
                function_input={
                    "task_id": workflow_input.task_id,
                    "response_id": workflow_input.response_id,
                },
            )

            if not trace_result["found"]:
                log.warning(
                    f"No traces found for task {workflow_input.task_id}, response {workflow_input.response_id}"
                )
                return None

            log.info(f"Found trace {trace_result['trace_id']} for performance metrics")

        except (ValueError, TypeError, RuntimeError, AttributeError) as e:
            log.error(f"Error querying traces: {e}")
            return None
        else:
            return trace_result

    async def _save_performance_metrics(
        self, workflow_input: TaskMetricsInput, trace_result: dict | None
    ) -> tuple[bool, list[str]]:
        """Save performance metrics. Returns (success, errors)."""
        errors = []
        try:
            if trace_result and trace_result["found"]:
                # Use trace data as source of truth
                perf = trace_result["performance"]
                await workflow.step(
                    function=ingest_performance_metrics,
                    function_input={
                        "task_id": workflow_input.task_id,
                        "agent_id": workflow_input.agent_id,
                        "agent_name": workflow_input.agent_name,
                        "parent_agent_id": workflow_input.parent_agent_id,
                        "workspace_id": workflow_input.workspace_id,
                        "agent_version": workflow_input.agent_version,
                        "response_id": workflow_input.response_id,
                        "response_index": workflow_input.response_index,
                        "message_count": workflow_input.message_count,
                        "duration_ms": perf["duration_ms"],
                        "input_tokens": perf["input_tokens"],
                        "output_tokens": perf["output_tokens"],
                        "cost_usd": perf["cost_usd"],
                        "status": workflow_input.status,
                        "task_input": perf["input"],
                        "task_output": perf["output"],
                        "trace_id": trace_result["trace_id"],
                        "span_id": trace_result["span_id"],
                    },
                )
                log.info("Performance metrics saved from traces")
            else:
                # Fallback to workflow input data
                log.warning("No traces found, using workflow input for performance metrics (legacy path)")
                await workflow.step(
                    function=ingest_performance_metrics,
                    function_input={
                        "task_id": workflow_input.task_id,
                        "agent_id": workflow_input.agent_id,
                        "agent_name": workflow_input.agent_name,
                        "parent_agent_id": workflow_input.parent_agent_id,
                        "workspace_id": workflow_input.workspace_id,
                        "agent_version": workflow_input.agent_version,
                        "response_id": workflow_input.response_id,
                        "response_index": workflow_input.response_index,
                        "message_count": workflow_input.message_count,
                        "duration_ms": workflow_input.duration_ms,
                        "input_tokens": workflow_input.input_tokens,
                        "output_tokens": workflow_input.output_tokens,
                        "status": workflow_input.status,
                        "task_input": workflow_input.task_input,
                        "task_output": workflow_input.task_output,
                    },
                )
                log.info("Performance metrics saved from workflow input (legacy)")
        except (ValueError, TypeError, RuntimeError, AttributeError) as e:
            log.error(f"Failed to save performance metrics: {e}")
            errors.append(f"Performance save error: {e!s}")
            return (False, errors)
        else:
            return (True, errors)

    def _prepare_evaluation_data(
        self, workflow_input: TaskMetricsInput, trace_result: dict | None
    ) -> tuple[dict, str, str]:
        """Prepare data for quality evaluation. Returns (performance_data, task_input, task_output)."""
        if trace_result and trace_result["found"]:
            perf = trace_result["performance"]
            performance_data = build_performance_data_dict(
                duration_ms=perf["duration_ms"],
                input_tokens=perf["input_tokens"],
                output_tokens=perf["output_tokens"],
                status=workflow_input.status,
            )
            return (performance_data, perf["input"], perf["output"])
        # Fallback to workflow input
        performance_data = build_performance_data_dict(
            duration_ms=workflow_input.duration_ms,
            input_tokens=workflow_input.input_tokens,
            output_tokens=workflow_input.output_tokens,
            status=workflow_input.status,
        )
        return (performance_data, workflow_input.task_input, workflow_input.task_output)

    async def _run_metric_evaluations(
        self, metrics: list, workflow_input: TaskMetricsInput, trace_result: dict | None
    ) -> list:
        """Run metric evaluations in parallel and return results."""
        # Prepare evaluation data
        performance_data, task_input, task_output = self._prepare_evaluation_data(
            workflow_input, trace_result
        )

        # Create evaluation tasks
        eval_tasks = []
        for metric_def in metrics:
            task = await create_metric_evaluation_task(
                metric_def=metric_def,
                task_id=workflow_input.task_id,
                task_input=task_input,
                task_output=task_output,
                performance_data=performance_data,
            )
            eval_tasks.append(task)

        # Run all evaluations in parallel
        log.info(f"Running {len(eval_tasks)} metric evaluations in parallel")
        eval_results = await asyncio.gather(*eval_tasks, return_exceptions=True)

        # Filter out exceptions
        quality_results = []
        for r in eval_results:
            if isinstance(r, Exception):
                log.error(f"Metric evaluation failed: {r}")
            elif r is not None:
                quality_results.append(r)

        log.info(
            f"Completed {len(quality_results)}/{len(eval_tasks)} metric evaluations successfully"
        )
        return quality_results

    async def _evaluate_and_save_quality_metrics(
        self, workflow_input: TaskMetricsInput, trace_result: dict | None
    ) -> tuple[list, list[str]]:
        """Evaluate and save quality metrics. Returns (quality_results, errors)."""
        errors = []
        quality_results = []

        if not workflow_input.run_quality_metrics:
            log.info("Skipping quality metrics (disabled)")
            return (quality_results, errors)

        try:
            # Fetch all active metrics
            metrics = await workflow.step(
                function=list_metric_definitions,
                function_input={
                    "workspace_id": workflow_input.workspace_id,
                    "category": None,
                    "metric_type": None,
                    "is_active": True,
                },
            )

            if not metrics:
                log.info("No active metrics found for workspace")
                return (quality_results, errors)

            log.info(f"Found {len(metrics)} active metrics to evaluate")

            # Run evaluations
            quality_results = await self._run_metric_evaluations(
                metrics, workflow_input, trace_result
            )

            # Link quality metrics to trace
            if trace_result and trace_result["found"]:
                for result in quality_results:
                    result["trace_id"] = trace_result["trace_id"]
                    result["span_id"] = trace_result["span_id"]

            # Save quality metrics
            if quality_results:
                await workflow.step(
                    function=ingest_quality_metrics,
                    function_input={
                        "task_id": workflow_input.task_id,
                        "agent_id": workflow_input.agent_id,
                        "workspace_id": workflow_input.workspace_id,
                        "quality_results": quality_results,
                        "response_id": workflow_input.response_id,
                        "response_index": workflow_input.response_index,
                        "message_count": workflow_input.message_count,
                    },
                )
                log.info(f"Quality metrics saved: {len(quality_results)} results")

        except (ValueError, TypeError, RuntimeError, AttributeError) as e:
            log.error(f"Quality metrics evaluation failed: {e}")
            errors.append(f"Quality metrics error: {e!s}")

        return (quality_results, errors)

    @workflow.run
    async def run(
        self, workflow_input: TaskMetricsInput
    ) -> TaskMetricsOutput:
        log.info(f"Starting metrics evaluation for task {workflow_input.task_id}")

        # Step 1: Query traces (source of truth for performance data)
        trace_result = await self._query_traces(workflow_input)

        # Step 2: Save performance metrics
        performance_saved, perf_errors = await self._save_performance_metrics(
            workflow_input, trace_result
        )

        # Step 3: Evaluate and save quality metrics
        quality_results, qual_errors = await self._evaluate_and_save_quality_metrics(
            workflow_input, trace_result
        )

        # Combine errors
        errors = perf_errors + qual_errors

        log.info(
            f"Task metrics workflow completed. "
            f"Performance saved: {performance_saved}, "
            f"Quality metrics: {len(quality_results)}"
        )

        return TaskMetricsOutput(
            task_id=workflow_input.task_id,
            performance_saved=performance_saved,
            quality_metrics_count=len(quality_results),
            quality_metrics_results=[
                MetricEvaluationResult(**r) for r in quality_results
            ],
            total_duration_ms=0,
            errors=errors,
        )
