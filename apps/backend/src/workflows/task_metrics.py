"""Task Metrics Workflow.

Evaluates task performance and runs quality metrics in parallel.
"""

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
    async def run(
        self, workflow_input: TaskMetricsInput
    ) -> TaskMetricsOutput:
        log.info(
            f"Starting metrics evaluation for task {workflow_input.task_id}"
        )

        errors = []

        # Step 1: Save performance metrics (ALWAYS)
        try:
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
            performance_saved = True
            log.info("Performance metrics saved")
        except Exception as e:
            log.error(f"Failed to save performance metrics: {e}")
            errors.append(f"Performance save error: {e!s}")
            performance_saved = False

        # Step 2: Quality metrics evaluation (global metrics)
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
                    log.info("No active metrics found for workspace")
                else:
                    log.info(f"Found {len(metrics)} active metrics to evaluate")
                    
                    # Build performance data dict
                    performance_data = build_performance_data_dict(
                        duration_ms=workflow_input.duration_ms,
                        input_tokens=workflow_input.input_tokens,
                        output_tokens=workflow_input.output_tokens,
                        status=workflow_input.status,
                    )
                    
                    # Create evaluation tasks for all metrics (run in parallel)
                    eval_tasks = []
                    for metric_def in metrics:
                        task = await create_metric_evaluation_task(
                            metric_def=metric_def,
                            task_id=workflow_input.task_id,
                            task_input=workflow_input.task_input,
                            task_output=workflow_input.task_output,
                            performance_data=performance_data,
                        )
                        eval_tasks.append(task)
                    
                    # Run all evaluations in parallel
                    log.info(f"Running {len(eval_tasks)} metric evaluations in parallel")
                    eval_results = await workflow.all(eval_tasks)
                    
                    # Filter out None results (failed evaluations)
                    quality_results = [r for r in eval_results if r is not None]
                    log.info(
                        f"Completed {len(quality_results)}/{len(eval_tasks)} metric evaluations successfully"
                    )
                    
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
                        log.info(f"Quality metrics saved: {len(quality_results)} results")
                        
            except Exception as e:
                log.error(f"Quality metrics evaluation failed: {e}")
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
