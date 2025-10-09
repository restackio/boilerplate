"""Metrics Evaluation Functions.

Executes different types of metrics: LLM judges, Python code, and formulas.
"""

import json
import os
import time
from typing import Any

from openai import OpenAI
from pydantic import BaseModel
from restack_ai.function import function, log

from src.database.connection import get_clickhouse_client

# ===================================
# Pydantic Models
# ===================================


class EvaluateLLMJudgeMetricInput(BaseModel):
    task_id: str
    task_input: str
    task_output: str
    metric_definition: dict[str, Any]


class EvaluatePythonCodeMetricInput(BaseModel):
    task_id: str
    task_input: str
    task_output: str
    performance_data: dict[str, Any]
    metric_definition: dict[str, Any]


class EvaluateFormulaMetricInput(BaseModel):
    task_id: str
    performance_data: dict[str, Any]
    metric_definition: dict[str, Any]


class IngestPerformanceMetricsInput(BaseModel):
    task_id: str
    agent_id: str
    agent_name: str
    parent_agent_id: str | None
    workspace_id: str
    agent_version: str
    duration_ms: int
    input_tokens: int
    output_tokens: int
    status: str
    task_input: str
    task_output: str
    # Response tracking (for continuous metrics)
    response_id: str | None = None
    response_index: int | None = None
    message_count: int | None = None


class IngestQualityMetricsInput(BaseModel):
    task_id: str
    agent_id: str
    workspace_id: str
    quality_results: list[dict[str, Any]]
    # Response tracking (for continuous metrics)
    response_id: str | None = None
    response_index: int | None = None
    message_count: int | None = None


# ===================================
# Evaluation Functions
# ===================================


@function.defn()
async def evaluate_llm_judge_metric(
    input_data: EvaluateLLMJudgeMetricInput,
) -> dict[str, Any] | None:
    """Evaluate using LLM as judge.

    Args:
        input_data: Input containing task_id, task_input, task_output, and metric_definition

    Returns:
        Evaluation result or None if failed
    """
    log.info(
        f"Running LLM judge metric: {input_data.metric_definition['name']}"
    )

    start_time = time.time()

    try:
        config = input_data.metric_definition["config"]
        judge_prompt = config.get("judge_prompt")
        judge_model = config.get("judge_model", "gpt-4o-mini")

        if not judge_prompt:
            log.error("No judge_prompt in config")
            return None

        # Initialize OpenAI
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        # Construct evaluation prompt
        full_prompt = f"""{judge_prompt}

TASK INPUT:
{input_data.task_input}

TASK OUTPUT:
{input_data.task_output}

Please evaluate and respond in JSON format:
{{
  "passed": <boolean true or false>,
  "score": <optional numeric score 0-100, or omit if not applicable>,
  "reasoning": "<brief explanation>"
}}"""

        # Call LLM
        response = client.chat.completions.create(
            model=judge_model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an evaluation expert. Provide objective assessments in JSON format.",
                },
                {"role": "user", "content": full_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )

        # Parse response
        result_text = response.choices[0].message.content
        result = json.loads(result_text)

        # Calculate cost (approximate)
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens

        # GPT-4o-mini pricing
        cost_usd = (input_tokens * 0.00015 / 1000) + (
            output_tokens * 0.0006 / 1000
        )

        duration_ms = int((time.time() - start_time) * 1000)

        log.info(
            f"LLM judge completed: {input_data.metric_definition['name']} - "
            f"Passed: {result['passed']}, "
            f"Duration: {duration_ms}ms, Cost: ${cost_usd:.6f}"
        )

        return {
            "metric_definition_id": input_data.metric_definition[
                "id"
            ],
            "metric_name": input_data.metric_definition["name"],
            "metric_type": "llm_judge",
            "passed": bool(result.get("passed", False)),
            "score": float(result["score"])
            if result.get("score") is not None
            else None,
            "reasoning": result.get("reasoning"),
            "eval_duration_ms": duration_ms,
            "eval_cost_usd": cost_usd,
        }

    except Exception as e:
        log.error(f"LLM judge evaluation failed: {e}")
        return None


@function.defn()
async def evaluate_python_code_metric(
    input_data: EvaluatePythonCodeMetricInput,
) -> dict[str, Any] | None:
    """Evaluate using custom Python code.

    Args:
        input_data: Input containing task_id, task_input, task_output, performance_data, and metric_definition

    Returns:
        Evaluation result or None if failed
    """
    log.info(
        f"Running Python code metric: {input_data.metric_definition['name']}"
    )

    start_time = time.time()

    try:
        config = input_data.metric_definition["config"]
        code = config.get("code")

        if not code:
            log.error("No code in config")
            return None

        # Create safe execution context
        context = {
            "task_input": input_data.task_input,
            "task_output": input_data.task_output,
            "performance": input_data.performance_data,
            "json": json,  # Allow JSON parsing
        }

        # Execute the user code
        exec(code, context)

        # The code should define an 'evaluate' function
        if "evaluate" not in context:
            log.error("Code must define an 'evaluate' function")
            return None

        # Call the evaluate function
        result = context["evaluate"](
            input_data.task_input,
            input_data.task_output,
            input_data.performance_data,
        )

        # Standardize result format - must return pass/fail
        if isinstance(result, bool):
            # Simple boolean
            passed = result
            score = None
            reasoning = None
        elif isinstance(result, dict):
            # Detailed result with reasoning
            passed = result.get("passed", False)
            score = (
                float(result["score"])
                if result.get("score") is not None
                else None
            )
            reasoning = result.get("reasoning")
        else:
            log.error(
                f"Invalid result type: {type(result)}. Must return boolean or dict with 'passed' key"
            )
            return None

        duration_ms = int((time.time() - start_time) * 1000)

        log.info(
            f"Python code metric completed: {input_data.metric_definition['name']} - "
            f"Passed: {passed}, Duration: {duration_ms}ms"
        )

        return {
            "metric_definition_id": input_data.metric_definition[
                "id"
            ],
            "metric_name": input_data.metric_definition["name"],
            "metric_type": "python_code",
            "passed": passed,
            "score": score,
            "reasoning": reasoning,
            "eval_duration_ms": duration_ms,
            "eval_cost_usd": 0.0,  # No cost for local execution
        }

    except Exception as e:
        log.error(f"Python code evaluation failed: {e}")
        return None


@function.defn()
async def evaluate_formula_metric(
    input_data: EvaluateFormulaMetricInput,
) -> dict[str, Any] | None:
    """Evaluate using a mathematical formula.

    Args:
        input_data: Input containing task_id, performance_data, and metric_definition

    Returns:
        Evaluation result or None if failed
    """
    log.info(
        f"Running formula metric: {input_data.metric_definition['name']}"
    )

    start_time = time.time()

    try:
        config = input_data.metric_definition["config"]
        formula = config.get("formula")
        variables = config.get("variables", [])

        if not formula:
            log.error("No formula in config")
            return None

        # Build variable context from performance data
        context = {}
        for var in variables:
            if var in input_data.performance_data:
                context[var] = input_data.performance_data[var]
            else:
                log.warning(
                    f"Variable {var} not found in performance data"
                )
                context[var] = 0

        # Evaluate formula safely (formula should return a boolean)
        try:
            result = eval(formula, {"__builtins__": {}}, context)
            passed = bool(result)
        except Exception as e:
            log.error(f"Formula evaluation failed: {e}")
            return None

        duration_ms = int((time.time() - start_time) * 1000)

        log.info(
            f"Formula metric completed: {input_data.metric_definition['name']} - "
            f"Passed: {passed}, Duration: {duration_ms}ms"
        )

        return {
            "metric_definition_id": input_data.metric_definition[
                "id"
            ],
            "metric_name": input_data.metric_definition["name"],
            "metric_type": "formula",
            "passed": passed,
            "score": None,  # Formulas are typically boolean
            "reasoning": f"Formula evaluated to: {result}",
            "eval_duration_ms": duration_ms,
            "eval_cost_usd": 0.0,  # No cost for formula evaluation
        }

    except Exception as e:
        log.error(f"Formula evaluation failed: {e}")
        return None


# ===================================
# ClickHouse Ingestion Functions
# ===================================


@function.defn()
async def ingest_performance_metrics(
    input_data: IngestPerformanceMetricsInput,
) -> bool:
    """Save performance metrics to ClickHouse (unified task_metrics table)."""
    log.info(
        f"Ingesting performance metrics for task {input_data.task_id}"
    )

    try:
        # Calculate cost (OpenAI GPT-4o pricing as default)
        cost_usd = (input_data.input_tokens * 0.0025 / 1000) + (
            input_data.output_tokens * 0.01 / 1000
        )

        client = get_clickhouse_client()

        # Define column names for unified table
        column_names = [
            "task_id",
            "agent_id",
            "workspace_id",
            "agent_name",
            "parent_agent_id",
            "agent_version",
            "response_id",
            "response_index",
            "message_count",
            "metric_category",
            "duration_ms",
            "input_tokens",
            "output_tokens",
            "cost_usd",
            "status",
            "task_input",
            "task_output",
        ]

        # Prepare data as list of lists (ClickHouse format)
        row_data = [
            input_data.task_id,
            input_data.agent_id,
            input_data.workspace_id,
            input_data.agent_name,
            input_data.parent_agent_id,
            input_data.agent_version,
            input_data.response_id,
            input_data.response_index,
            input_data.message_count,
            "performance",  # metric_category
            input_data.duration_ms,
            input_data.input_tokens,
            input_data.output_tokens,
            cost_usd,
            input_data.status,
            input_data.task_input,
            input_data.task_output,
        ]

        client.insert(
            "task_metrics",
            [row_data],
            column_names=column_names,
        )

        log.info(
            f"Performance metrics saved for task {input_data.task_id}"
        )
        return True

    except Exception as e:
        log.error(f"Failed to ingest performance metrics: {e}")
        log.error(f"Error type: {type(e).__name__}")
        log.error(f"Error args: {getattr(e, 'args', 'No args')}")
        import traceback
        log.error(f"Traceback: {traceback.format_exc()}")
        raise  # Re-raise so workflow can handle it properly


@function.defn()
async def ingest_quality_metrics(
    input_data: IngestQualityMetricsInput,
) -> bool:
    """Save quality metrics to ClickHouse (unified task_metrics table)."""
    log.info(
        f"Ingesting {len(input_data.quality_results)} quality metrics for task {input_data.task_id}"
    )

    try:
        if not input_data.quality_results:
            return True

        client = get_clickhouse_client()

        # Define column names for unified table
        column_names = [
            "task_id",
            "agent_id",
            "workspace_id",
            "metric_category",
            "metric_definition_id",
            "metric_name",
            "metric_type",
            "response_id",
            "response_index",
            "message_count",
            "passed",
            "score",
            "reasoning",
            "eval_duration_ms",
            "eval_cost_usd",
        ]

        # Prepare batch insert as list of lists (ClickHouse format)
        rows = [
            [
                input_data.task_id,
                input_data.agent_id,
                input_data.workspace_id,
                "quality",  # metric_category
                result["metric_definition_id"],
                result["metric_name"],
                result["metric_type"],
                input_data.response_id,
                input_data.response_index,
                input_data.message_count,
                result["passed"],
                result.get("score"),  # Optional score
                result.get("reasoning"),
                result["eval_duration_ms"],
                result["eval_cost_usd"],
            ]
            for result in input_data.quality_results
        ]

        client.insert(
            "task_metrics",
            rows,
            column_names=column_names,
        )

        log.info(
            f"Quality metrics saved for task {input_data.task_id}"
        )
        return True

    except Exception as e:
        log.error(f"Failed to ingest quality metrics: {e}")
        log.error(f"Error type: {type(e).__name__}")
        log.error(f"Error args: {getattr(e, 'args', 'No args')}")
        import traceback
        log.error(f"Traceback: {traceback.format_exc()}")
        raise  # Re-raise so workflow can handle it properly
