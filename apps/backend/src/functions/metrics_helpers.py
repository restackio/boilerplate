"""Metrics Helper Functions.

Utilities for metric evaluation and processing.
"""

from typing import Any

from restack_ai.workflow import workflow


async def create_metric_evaluation_task(
    metric_def: dict[str, Any],
    task_id: str,
    task_input: str,
    task_output: str,
    performance_data: dict[str, Any],
) -> Any:
    """Create appropriate metric evaluation task based on metric type.

    Args:
        metric_def: Metric definition dict with 'metric_type' and other config
        task_id: Task ID being evaluated
        task_input: Input to the task
        task_output: Output from the task
        performance_data: Performance metrics (duration_ms, tokens, etc.)

    Returns:
        Workflow step promise for the evaluation

    Raises:
        ValueError: If metric type is unknown
    """
    from src.functions.metrics_evaluation import (
        evaluate_formula_metric,
        evaluate_llm_judge_metric,
        evaluate_python_code_metric,
    )

    metric_type = metric_def["metric_type"]

    if metric_type == "llm_judge":
        return workflow.step(
            evaluate_llm_judge_metric,
            function_input={
                "task_id": task_id,
                "task_input": task_input,
                "task_output": task_output,
                "metric_definition": metric_def,
            },
        )
    if metric_type == "python_code":
        return workflow.step(
            evaluate_python_code_metric,
            function_input={
                "task_id": task_id,
                "task_input": task_input,
                "task_output": task_output,
                "performance_data": performance_data,
                "metric_definition": metric_def,
            },
        )
    if metric_type == "formula":
        return workflow.step(
            evaluate_formula_metric,
            function_input={
                "task_id": task_id,
                "performance_data": performance_data,
                "metric_definition": metric_def,
            },
        )
    msg = f"Unknown metric type: {metric_type}"
    raise ValueError(msg)


def build_performance_data_dict(
    duration_ms: int,
    input_tokens: int,
    output_tokens: int,
    status: str,
) -> dict[str, Any]:
    """Build standardized performance data dictionary.

    Args:
        duration_ms: Task duration in milliseconds
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        status: Task status

    Returns:
        Dictionary with performance data
    """
    return {
        "duration_ms": duration_ms,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "status": status,
    }
