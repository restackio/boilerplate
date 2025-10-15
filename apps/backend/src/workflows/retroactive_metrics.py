"""Retroactive Metrics Evaluation Workflow.

Allows running new quality metrics against historical traces.
This enables evaluating past agent runs with newly defined metrics.
"""

import asyncio
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

    async def _fetch_metric_definition(
        self, workflow_input: RetroactiveMetricsInput
    ) -> dict | None:
        """Fetch and validate metric definition."""
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
                log.error(
                    f"Metric {workflow_input.metric_definition_id} not found"
                )
                return None

            metric_def = metric_result["metric"]
            log.info(
                f"Found metric: {metric_def['name']} ({metric_def['metric_type']})"
            )

        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
        ) as e:
            log.error(f"Failed to fetch metric definition: {e}")
            return None
        else:
            return metric_def

    def _should_stop_batch_processing(
        self,
        workflow_input: RetroactiveMetricsInput,
        total_processed: int,
    ) -> bool:
        """Check if batch processing should stop."""
        if (
            workflow_input.max_traces
            and total_processed >= workflow_input.max_traces
        ):
            log.info(
                f"Reached max_traces limit: {workflow_input.max_traces}"
            )
            return True
        return False

    def _apply_sampling(
        self, spans: list, workflow_input: RetroactiveMetricsInput
    ) -> list:
        """Apply deterministic sampling to spans if configured."""
        if workflow_input.sample_percentage is None:
            return spans

        step = max(int(1 / workflow_input.sample_percentage), 1)
        sampled = [
            span for i, span in enumerate(spans) if i % step == 0
        ]
        log.info(
            f"Deterministic sampling (every {step}th): {len(sampled)}/{len(spans)} traces"
        )
        return sampled

    async def _create_evaluation_task(
        self,
        workflow_input: RetroactiveMetricsInput,
        metric_def: dict,
        span: dict,
    ) -> dict:
        """Create appropriate evaluation task based on metric type."""
        trace_metadata = {
            "trace_id": span["trace_id"],
            "span_id": span["span_id"],
        }

        metric_type = metric_def["metric_type"]

        if metric_type == "llm_judge":
            return self._evaluate_and_save_llm_judge(
                workflow_input, metric_def, span, trace_metadata
            )
        if metric_type == "python_code":
            return self._evaluate_and_save_python_code(
                workflow_input, metric_def, span, trace_metadata
            )
        if metric_type == "formula":
            return self._evaluate_and_save_formula(
                workflow_input, metric_def, span, trace_metadata
            )
        log.warning(
            f"Unknown metric type: {metric_type}, skipping"
        )
        return None

    async def _process_batch(  # noqa: C901
        self,
        workflow_input: RetroactiveMetricsInput,
        metric_def: dict,
        offset: int,
    ) -> tuple[int, int, int, bool]:
        """Process a batch of traces. Returns (processed, completed, failed, has_more)."""
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
            return (0, 0, 0, False)

        log.info(
            f"Processing batch: {len(trace_batch['spans'])} traces (offset {offset})"
        )

        # Apply sampling
        spans_to_process = self._apply_sampling(
            trace_batch["spans"], workflow_input
        )

        # Create evaluation tasks
        eval_tasks = []
        processed_count = 0

        for span in spans_to_process:
            if span["span_type"] != "response":
                continue

            # Filter by parent agent if metric has associated agents
            parent_agent_ids = metric_def.get(
                "parent_agent_ids", []
            )
            if parent_agent_ids:
                # Get the agent's parent_agent_id from span
                span_parent_agent_id = span.get("parent_agent_id")
                # Skip if span's parent agent doesn't match metric's agents
                if (
                    not span_parent_agent_id
                    or span_parent_agent_id
                    not in parent_agent_ids
                ):
                    continue

            processed_count += 1
            task = await self._create_evaluation_task(
                workflow_input, metric_def, span
            )
            if task:
                eval_tasks.append(task)

        # Run evaluations in parallel
        completed = 0
        failed = 0
        if eval_tasks:
            log.info(
                f"Running {len(eval_tasks)} evaluations in parallel"
            )
            results = await asyncio.gather(
                *eval_tasks, return_exceptions=True
            )

            for result in results:
                if isinstance(result, Exception):
                    log.error(f"Evaluation failed: {result}")
                    failed += 1
                elif result:
                    completed += 1
                else:
                    failed += 1

            log.info(
                f"Batch complete: {completed} succeeded, {failed} failed"
            )

        has_more = trace_batch.get("has_more", False)
        return (processed_count, completed, failed, has_more)

    @workflow.run
    async def run(
        self, workflow_input: RetroactiveMetricsInput
    ) -> RetroactiveMetricsOutput:
        log.info(
            f"Starting retroactive evaluation for metric {workflow_input.metric_definition_id}"
        )

        # Step 1: Fetch metric definition
        metric_def = await self._fetch_metric_definition(
            workflow_input
        )
        if not metric_def:
            error_msg = "Failed to fetch metric definition"
            return RetroactiveMetricsOutput(
                metric_id=workflow_input.metric_definition_id,
                metric_name="Unknown",
                traces_processed=0,
                evaluations_completed=0,
                evaluations_failed=0,
                errors=[error_msg],
            )

        # Step 2: Process traces in batches
        offset = 0
        total_processed = 0
        total_completed = 0
        total_failed = 0
        errors = []

        while True:
            if self._should_stop_batch_processing(
                workflow_input, total_processed
            ):
                break

            try:
                (
                    processed,
                    completed,
                    failed,
                    has_more,
                ) = await self._process_batch(
                    workflow_input, metric_def, offset
                )

                if processed == 0:
                    break  # No more traces

                total_processed += processed
                total_completed += completed
                total_failed += failed

                offset += workflow_input.batch_size

                if not has_more:
                    break

            except (
                ValueError,
                TypeError,
                RuntimeError,
                AttributeError,
            ) as e:
                error_msg = f"Error processing batch at offset {offset}: {e}"
                log.error(error_msg)
                errors.append(error_msg)
                break

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

    async def _evaluate_and_save_llm_judge(
        self,
        workflow_input: RetroactiveMetricsInput,
        metric_def: dict,
        span: dict,
        trace_metadata: dict,
    ) -> bool:
        """Evaluate LLM judge metric and save result."""
        try:
            # Step 1: Evaluate
            result = await workflow.step(
                function=evaluate_llm_judge_metric,
                function_input={
                    "task_id": span["task_id"],
                    "task_input": span["input"],
                    "task_output": span["output"],
                    "metric_definition": metric_def,
                },
                start_to_close_timeout=timedelta(minutes=2),
            )

            if not result:
                return False

            # Step 2: Save result
            await workflow.step(
                function=ingest_quality_metrics,
                function_input={
                    "task_id": span["task_id"],
                    "agent_id": span["agent_id"],
                    "workspace_id": workflow_input.workspace_id,
                    "trace_id": trace_metadata["trace_id"],
                    "span_id": trace_metadata["span_id"],
                    "quality_results": [result],
                    "response_id": None,
                    "response_index": None,
                    "message_count": None,
                },
                start_to_close_timeout=timedelta(seconds=30),
            )
        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
        ) as e:
            log.error(
                f"Failed to evaluate and save LLM judge: {e}"
            )
            return False
        else:
            return True

    async def _evaluate_and_save_python_code(
        self,
        workflow_input: RetroactiveMetricsInput,
        metric_def: dict,
        span: dict,
        trace_metadata: dict,
    ) -> bool:
        """Evaluate Python code metric and save result."""
        try:
            # Build performance data
            performance_data = build_performance_data_dict(
                duration_ms=span["duration_ms"],
                input_tokens=span["input_tokens"],
                output_tokens=span["output_tokens"],
                status=span["status"],
            )

            # Step 1: Evaluate
            result = await workflow.step(
                function=evaluate_python_code_metric,
                function_input={
                    "task_id": span["task_id"],
                    "task_input": span["input"],
                    "task_output": span["output"],
                    "performance_data": performance_data,
                    "metric_definition": metric_def,
                },
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not result:
                return False

            # Step 2: Save result
            await workflow.step(
                function=ingest_quality_metrics,
                function_input={
                    "task_id": span["task_id"],
                    "agent_id": span["agent_id"],
                    "workspace_id": workflow_input.workspace_id,
                    "trace_id": trace_metadata["trace_id"],
                    "span_id": trace_metadata["span_id"],
                    "quality_results": [result],
                    "response_id": None,
                    "response_index": None,
                    "message_count": None,
                },
                start_to_close_timeout=timedelta(seconds=30),
            )
        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
        ) as e:
            log.error(
                f"Failed to evaluate and save Python code: {e}"
            )
            return False
        else:
            return True

    async def _evaluate_and_save_formula(
        self,
        workflow_input: RetroactiveMetricsInput,
        metric_def: dict,
        span: dict,
        trace_metadata: dict,
    ) -> bool:
        """Evaluate formula metric and save result."""
        try:
            # Build performance data
            performance_data = build_performance_data_dict(
                duration_ms=span["duration_ms"],
                input_tokens=span["input_tokens"],
                output_tokens=span["output_tokens"],
                status=span["status"],
            )

            # Step 1: Evaluate
            result = await workflow.step(
                function=evaluate_formula_metric,
                function_input={
                    "task_id": span["task_id"],
                    "performance_data": performance_data,
                    "metric_definition": metric_def,
                },
                start_to_close_timeout=timedelta(seconds=10),
            )

            if not result:
                return False

            # Step 2: Save result
            await workflow.step(
                function=ingest_quality_metrics,
                function_input={
                    "task_id": span["task_id"],
                    "agent_id": span["agent_id"],
                    "workspace_id": workflow_input.workspace_id,
                    "trace_id": trace_metadata["trace_id"],
                    "span_id": trace_metadata["span_id"],
                    "quality_results": [result],
                    "response_id": None,
                    "response_index": None,
                    "message_count": None,
                },
                start_to_close_timeout=timedelta(seconds=30),
            )
        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
        ) as e:
            log.error(f"Failed to evaluate and save formula: {e}")
            return False
        else:
            return True
