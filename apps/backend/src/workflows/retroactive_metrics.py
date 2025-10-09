"""Retroactive Metrics Evaluation Workflow.

Allows running new quality metrics against historical traces.
This enables evaluating past agent runs with newly defined metrics.
"""

from dataclasses import dataclass
from datetime import timedelta

from restack_ai.workflow import import_functions, log, workflow

with import_functions():
    from src.functions.metrics_crud import (
        get_metric_definition_by_id,
    )
    from src.functions.metrics_evaluation import (
        evaluate_formula_metric,
        evaluate_llm_judge_metric,
        evaluate_python_code_metric,
        ingest_quality_metrics,
    )
    from src.functions.metrics_helpers import (
        build_performance_data_dict,
    )
    from src.functions.traces_query import query_traces_batch


@dataclass
class RetroactiveMetricsInput:
    """Input for retroactive metrics evaluation."""

    workspace_id: str
    metric_definition_id: str
    filters: dict  # agent_id, date_range, agent_version, etc.
    batch_size: int = 100
    max_traces: int | None = (
        None  # Limit total traces to evaluate
    )
    sample_percentage: float | None = (
        None  # Sample X% of traces (e.g., 0.1 = 10%)
    )


@dataclass
class RetroactiveMetricsOutput:
    """Output from retroactive evaluation."""

    metric_id: str
    metric_name: str
    traces_processed: int
    evaluations_completed: int
    evaluations_failed: int
    errors: list[str]


@workflow.defn()
class RetroactiveMetrics:
    """Run a new metric against historical traces.

    This workflow:
    1. Fetches the metric definition
    2. Queries traces in batches (to avoid memory issues)
    3. Evaluates the metric against each trace's I/O
    4. Saves results to task_metrics table (linked to trace_id/span_id)

    Use cases:
    - Created a new quality metric and want to evaluate all past runs
    - Changed a metric definition and want to re-evaluate
    - Analyzing performance of different agent versions
    """

    @workflow.run
    async def run(  # noqa: PLR0915
        self, workflow_input: RetroactiveMetricsInput
    ) -> RetroactiveMetricsOutput:
        log.info(
            f"Starting retroactive evaluation for metric {workflow_input.metric_definition_id}"
        )

        # Step 1: Fetch metric definition
        try:
            metric_result = await workflow.step(
                function=get_metric_definition_by_id,
                function_input={
                    "metric_id": workflow_input.metric_definition_id,
                    "workspace_id": workflow_input.workspace_id,
                },
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not metric_result or not metric_result.get(
                "metric"
            ):
                error_msg = f"Metric {workflow_input.metric_definition_id} not found"
                log.error(error_msg)
                return RetroactiveMetricsOutput(
                    metric_id=workflow_input.metric_definition_id,
                    metric_name="Unknown",
                    traces_processed=0,
                    evaluations_completed=0,
                    evaluations_failed=0,
                    errors=[error_msg],
                )

            metric_def = metric_result["metric"]
            log.info(
                f"Found metric: {metric_def['name']} ({metric_def['metric_type']})"
            )

        except Exception as e:
            error_msg = f"Failed to fetch metric definition: {e}"
            log.error(error_msg)
            return RetroactiveMetricsOutput(
                metric_id=workflow_input.metric_definition_id,
                metric_name="Unknown",
                traces_processed=0,
                evaluations_completed=0,
                evaluations_failed=0,
                errors=[error_msg],
            )

        # Step 2: Query traces in batches and evaluate
        offset = 0
        total_processed = 0
        total_completed = 0
        total_failed = 0
        errors = []

        while True:
            # Check if we've hit max_traces limit
            if (
                workflow_input.max_traces
                and total_processed >= workflow_input.max_traces
            ):
                log.info(
                    f"Reached max_traces limit: {workflow_input.max_traces}"
                )
                break

            try:
                # Query batch of traces
                trace_batch = await workflow.step(
                    function=query_traces_batch,
                    function_input={
                        "workspace_id": workflow_input.workspace_id,
                        "filters": workflow_input.filters,
                        "limit": workflow_input.batch_size,
                        "offset": offset,
                    },
                    start_to_close_timeout=timedelta(seconds=60),
                )

                if not trace_batch["spans"]:
                    log.info("No more traces to process")
                    break  # No more traces

                log.info(
                    f"Processing batch: {len(trace_batch['spans'])} traces (offset {offset})"
                )

                # Apply sampling if specified
                spans_to_process = trace_batch["spans"]
                if workflow_input.sample_percentage is not None:
                    import random

                    sample_size = int(
                        len(spans_to_process)
                        * workflow_input.sample_percentage
                    )
                    spans_to_process = random.sample(
                        spans_to_process,
                        min(sample_size, len(spans_to_process)),
                    )
                    log.info(
                        f"Sampling {workflow_input.sample_percentage * 100}%: "
                        f"{len(spans_to_process)}/{len(trace_batch['spans'])} traces"
                    )

                # Step 3: Evaluate metric for each trace (in parallel)
                eval_tasks = []
                trace_metadata = []  # Store (trace_id, span_id, task_id, agent_id) for each eval

                for span in spans_to_process:
                    if span["span_type"] != "generation":
                        continue  # Only evaluate generation spans

                    # Store metadata for linking results back to traces
                    trace_metadata.append(
                        {
                            "trace_id": span["trace_id"],
                            "span_id": span["span_id"],
                            "task_id": span["task_id"],
                            "agent_id": span["agent_id"],
                        }
                    )

                    # Create evaluation task based on metric type
                    metric_type = metric_def["metric_type"]

                    if metric_type == "llm_judge":
                        task = workflow.step(
                            function=evaluate_llm_judge_metric,
                            function_input={
                                "task_id": span["task_id"],
                                "task_input": span["input"],
                                "task_output": span["output"],
                                "metric_definition": metric_def,
                            },
                            start_to_close_timeout=timedelta(
                                minutes=2
                            ),  # LLM calls can take time
                        )
                    elif metric_type == "python_code":
                        # Build performance data from span
                        performance_data = (
                            build_performance_data_dict(
                                duration_ms=span["duration_ms"],
                                input_tokens=span["input_tokens"],
                                output_tokens=span[
                                    "output_tokens"
                                ],
                                status=span["status"],
                            )
                        )
                        task = workflow.step(
                            function=evaluate_python_code_metric,
                            function_input={
                                "task_id": span["task_id"],
                                "task_input": span["input"],
                                "task_output": span["output"],
                                "performance_data": performance_data,
                                "metric_definition": metric_def,
                            },
                            start_to_close_timeout=timedelta(
                                seconds=30
                            ),
                        )
                    elif metric_type == "formula":
                        performance_data = (
                            build_performance_data_dict(
                                duration_ms=span["duration_ms"],
                                input_tokens=span["input_tokens"],
                                output_tokens=span[
                                    "output_tokens"
                                ],
                                status=span["status"],
                            )
                        )
                        task = workflow.step(
                            function=evaluate_formula_metric,
                            function_input={
                                "task_id": span["task_id"],
                                "performance_data": performance_data,
                                "metric_definition": metric_def,
                            },
                            start_to_close_timeout=timedelta(
                                seconds=10
                            ),
                        )
                    else:
                        log.warning(
                            f"Unknown metric type: {metric_type}, skipping"
                        )
                        continue

                    eval_tasks.append(task)

                # Wait for all evaluations in this batch
                if eval_tasks:
                    eval_results = await workflow.all(eval_tasks)

                    # Step 4: Link results to traces and save
                    quality_results = []
                    for metadata, result in zip(
                        trace_metadata, eval_results, strict=False
                    ):
                        if result:
                            # Link result to trace
                            result["trace_id"] = metadata[
                                "trace_id"
                            ]
                            result["span_id"] = metadata[
                                "span_id"
                            ]
                            quality_results.append(result)
                            total_completed += 1
                        else:
                            total_failed += 1

                    # Save batch of results (grouped by task for efficiency)
                    # Group by task_id
                    results_by_task = {}
                    for metadata, result in zip(
                        trace_metadata,
                        quality_results,
                        strict=False,
                    ):
                        task_id = metadata["task_id"]
                        if task_id not in results_by_task:
                            results_by_task[task_id] = {
                                "task_id": task_id,
                                "agent_id": metadata["agent_id"],
                                "results": [],
                            }
                        results_by_task[task_id][
                            "results"
                        ].append(result)

                    # Insert each task's results
                    for task_data in results_by_task.values():
                        try:
                            await workflow.step(
                                function=ingest_quality_metrics,
                                function_input={
                                    "task_id": task_data[
                                        "task_id"
                                    ],
                                    "agent_id": task_data[
                                        "agent_id"
                                    ],
                                    "workspace_id": workflow_input.workspace_id,
                                    "quality_results": task_data[
                                        "results"
                                    ],
                                    # No response_id for retroactive eval (not tied to specific conversation turn)
                                    "response_id": None,
                                    "response_index": None,
                                    "message_count": None,
                                },
                                start_to_close_timeout=timedelta(
                                    seconds=30
                                ),
                            )
                        except Exception as e:
                            error_msg = f"Failed to save results for task {task_data['task_id']}: {e}"
                            log.error(error_msg)
                            errors.append(error_msg)

                    log.info(
                        f"Batch complete: {total_completed} succeeded, {total_failed} failed"
                    )

                total_processed += len(trace_batch["spans"])
                offset += len(trace_batch["spans"])

                # Check if there are more traces
                if not trace_batch.get("has_more", False):
                    break

            except Exception as e:
                error_msg = f"Error processing batch at offset {offset}: {e}"
                log.error(error_msg)
                errors.append(error_msg)
                break  # Stop on batch error

        log.info(
            f"Retroactive evaluation complete: {total_completed}/{total_processed} traces evaluated successfully"
        )

        return RetroactiveMetricsOutput(
            metric_id=workflow_input.metric_definition_id,
            metric_name=metric_def["name"],
            traces_processed=total_processed,
            evaluations_completed=total_completed,
            evaluations_failed=total_failed,
            errors=errors,
        )
