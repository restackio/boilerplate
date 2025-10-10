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

    @workflow.run
    async def run(  # noqa: PLR0915
        self, workflow_input: TaskMetricsInput
    ) -> TaskMetricsOutput:
        log.info(
            f"Starting metrics evaluation for task {workflow_input.task_id}"
        )

        errors = []

        # Step 1: Query traces to derive performance metrics (SOURCE OF TRUTH)
        trace_result = None
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
                # Fall back to workflow input data (legacy path)
                trace_result = None
            else:
                log.info(
                    f"Found trace {trace_result['trace_id']} for performance metrics"
                )
        except Exception as e:
            log.error(f"Error querying traces: {e}")
            trace_result = None

        # Step 2: Save performance metrics (from traces if available, else from workflow input)
        try:
            if trace_result and trace_result["found"]:
                # PREFERRED: Use trace data as source of truth
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
                        # Performance data from TRACES (source of truth):
                        "duration_ms": perf["duration_ms"],
                        "input_tokens": perf["input_tokens"],
                        "output_tokens": perf["output_tokens"],
                        "cost_usd": perf["cost_usd"],
                        "status": workflow_input.status,
                        "task_input": perf["input"],
                        "task_output": perf["output"],
                        # Link to trace:
                        "trace_id": trace_result["trace_id"],
                        "span_id": trace_result["span_id"],
                    },
                )
                log.info("Performance metrics saved from traces")
            else:
                # FALLBACK: Use workflow input data (legacy)
                log.warning(
                    "No traces found, using workflow input for performance metrics (legacy path)"
                )
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
                log.info(
                    "Performance metrics saved from workflow input (legacy)"
                )
            performance_saved = True
        except Exception as e:
            log.error(f"Failed to save performance metrics: {e}")
            errors.append(f"Performance save error: {e!s}")
            performance_saved = False

        # Step 3: Quality metrics evaluation (global metrics)
        quality_results = []

        if not workflow_input.run_quality_metrics:
            log.info("Skipping quality metrics (disabled)")
        else:
            try:
                # Fetch all active metrics for the workspace
                metrics = await workflow.step(
                    function=list_metric_definitions,
                    function_input={
                        "workspace_id": workflow_input.workspace_id,
                        "category": None,  # All categories
                        "metric_type": None,  # All types
                        "is_active": True,  # Only active metrics
                    },
                )

                if not metrics:
                    log.info(
                        "No active metrics found for workspace"
                    )
                else:
                    log.info(
                        f"Found {len(metrics)} active metrics to evaluate"
                    )

                    # Build performance data dict (use trace data if available)
                    if trace_result and trace_result["found"]:
                        perf = trace_result["performance"]
                        performance_data = (
                            build_performance_data_dict(
                                duration_ms=perf["duration_ms"],
                                input_tokens=perf["input_tokens"],
                                output_tokens=perf[
                                    "output_tokens"
                                ],
                                status=workflow_input.status,
                            )
                        )
                        # Use trace I/O for quality evaluation
                        task_input_for_eval = perf["input"]
                        task_output_for_eval = perf["output"]
                    else:
                        # Fallback to workflow input
                        performance_data = build_performance_data_dict(
                            duration_ms=workflow_input.duration_ms,
                            input_tokens=workflow_input.input_tokens,
                            output_tokens=workflow_input.output_tokens,
                            status=workflow_input.status,
                        )
                        task_input_for_eval = (
                            workflow_input.task_input
                        )
                        task_output_for_eval = (
                            workflow_input.task_output
                        )

                    # Create evaluation tasks for all metrics (run in parallel)
                    eval_tasks = []
                    for metric_def in metrics:
                        task = (
                            await create_metric_evaluation_task(
                                metric_def=metric_def,
                                task_id=workflow_input.task_id,
                                task_input=task_input_for_eval,
                                task_output=task_output_for_eval,
                                performance_data=performance_data,
                            )
                        )
                        eval_tasks.append(task)

                    # Run all evaluations in parallel (return_exceptions=True means failures don't block)
                    log.info(
                        f"Running {len(eval_tasks)} metric evaluations in parallel"
                    )
                    eval_results = await asyncio.gather(
                        *eval_tasks, return_exceptions=True
                    )

                    # Filter out None results and exceptions (failed evaluations)
                    quality_results = []
                    for r in eval_results:
                        if isinstance(r, Exception):
                            log.error(
                                f"Metric evaluation failed: {r}"
                            )
                        elif r is not None:
                            quality_results.append(r)
                    log.info(
                        f"Completed {len(quality_results)}/{len(eval_tasks)} metric evaluations successfully"
                    )

                    # Link quality metrics to trace (if available)
                    if trace_result and trace_result["found"]:
                        for result in quality_results:
                            result["trace_id"] = trace_result[
                                "trace_id"
                            ]
                            result["span_id"] = trace_result[
                                "span_id"
                            ]

                    # Save quality metrics to ClickHouse
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
                        log.info(
                            f"Quality metrics saved: {len(quality_results)} results"
                        )

            except Exception as e:
                log.error(
                    f"Quality metrics evaluation failed: {e}"
                )
                errors.append(f"Quality metrics error: {e!s}")

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
                MetricEvaluationResult(**r)
                for r in quality_results
            ],
            total_duration_ms=0,  # Duration tracking removed (non-deterministic in workflows)
            errors=errors,
        )
