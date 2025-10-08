"""
Metrics Evaluation Functions
Executes different types of metrics: LLM judges, Python code, and formulas
"""
import json
import time
from typing import Any

from openai import OpenAI
from restack_ai.function import function, log

from src.database.clickhouse import get_clickhouse_client
from src.services import get_openai_api_key


# ===================================
# Evaluation Functions
# ===================================


@function.defn()
async def evaluate_llm_judge_metric(
    task_id: str,
    task_input: str,
    task_output: str,
    metric_definition: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Evaluate using LLM as judge
    
    Args:
        task_id: Task UUID
        task_input: Original task input
        task_output: Task output/response
        metric_definition: Metric configuration with judge_prompt and judge_model
    
    Returns:
        Evaluation result or None if failed
    """
    log.info(f"Running LLM judge metric: {metric_definition['name']}")
    
    start_time = time.time()
    
    try:
        config = metric_definition["config"]
        judge_prompt = config.get("judge_prompt")
        judge_model = config.get("judge_model", "gpt-4o-mini")
        
        if not judge_prompt:
            log.error("No judge_prompt in config")
            return None
        
        # Initialize OpenAI
        openai_api_key = get_openai_api_key()
        client = OpenAI(api_key=openai_api_key)
        
        # Construct evaluation prompt
        full_prompt = f"""{judge_prompt}

TASK INPUT:
{task_input}

TASK OUTPUT:
{task_output}

Please evaluate and respond in JSON format:
{{
  "score": <float 0-100>,
  "passed": <boolean>,
  "reasoning": "<brief explanation>"
}}"""
        
        # Call LLM
        response = client.chat.completions.create(
            model=judge_model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an evaluation expert. Provide objective assessments in JSON format."
                },
                {"role": "user", "content": full_prompt}
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
        cost_usd = (input_tokens * 0.00015 / 1000) + (output_tokens * 0.0006 / 1000)
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        log.info(
            f"LLM judge completed: {metric_definition['name']} - "
            f"Score: {result['score']}, Passed: {result['passed']}, "
            f"Duration: {duration_ms}ms, Cost: ${cost_usd:.6f}"
        )
        
        return {
            "metric_definition_id": metric_definition["id"],
            "metric_name": metric_definition["name"],
            "metric_type": "llm_judge",
            "score": float(result.get("score", 0)),
            "passed": bool(result.get("passed", False)),
            "reasoning": result.get("reasoning"),
            "metadata": {
                "model": judge_model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
            },
            "eval_duration_ms": duration_ms,
            "eval_cost_usd": cost_usd,
        }
        
    except Exception as e:
        log.error(f"LLM judge evaluation failed: {e}")
        return None


@function.defn()
async def evaluate_python_code_metric(
    task_id: str,
    task_input: str,
    task_output: str,
    performance_data: dict[str, Any],
    metric_definition: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Evaluate using custom Python code
    
    Args:
        task_id: Task UUID
        task_input: Original task input
        task_output: Task output/response
        performance_data: Performance metrics (duration, tokens, etc.)
        metric_definition: Metric configuration with Python code
    
    Returns:
        Evaluation result or None if failed
    """
    log.info(f"Running Python code metric: {metric_definition['name']}")
    
    start_time = time.time()
    
    try:
        config = metric_definition["config"]
        code = config.get("code")
        
        if not code:
            log.error("No code in config")
            return None
        
        # Create safe execution context
        context = {
            "task_input": task_input,
            "task_output": task_output,
            "performance": performance_data,
            "json": json,  # Allow JSON parsing
        }
        
        # Execute the user code
        exec(code, context)
        
        # The code should define an 'evaluate' function
        if "evaluate" not in context:
            log.error("Code must define an 'evaluate' function")
            return None
        
        # Call the evaluate function
        result = context["evaluate"](task_input, task_output, performance_data)
        
        # Standardize result format
        if isinstance(result, (int, float)):
            # Simple numeric score
            score = float(result)
            passed = score >= metric_definition.get("min_value", 50)
            reasoning = None
        elif isinstance(result, dict):
            # Detailed result
            score = float(result.get("score", 0))
            passed = result.get("passed", score >= 50)
            reasoning = result.get("reasoning")
        else:
            log.error(f"Invalid result type: {type(result)}")
            return None
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        log.info(
            f"Python code metric completed: {metric_definition['name']} - "
            f"Score: {score}, Passed: {passed}, Duration: {duration_ms}ms"
        )
        
        return {
            "metric_definition_id": metric_definition["id"],
            "metric_name": metric_definition["name"],
            "metric_type": "python_code",
            "score": score,
            "passed": passed,
            "reasoning": reasoning,
            "metadata": {},
            "eval_duration_ms": duration_ms,
            "eval_cost_usd": 0.0,  # No cost for local execution
        }
        
    except Exception as e:
        log.error(f"Python code evaluation failed: {e}")
        return None


@function.defn()
async def evaluate_formula_metric(
    task_id: str,
    performance_data: dict[str, Any],
    metric_definition: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Evaluate using a mathematical formula
    
    Args:
        task_id: Task UUID
        performance_data: Performance metrics to use in formula
        metric_definition: Metric configuration with formula
    
    Returns:
        Evaluation result or None if failed
    """
    log.info(f"Running formula metric: {metric_definition['name']}")
    
    start_time = time.time()
    
    try:
        config = metric_definition["config"]
        formula = config.get("formula")
        variables = config.get("variables", [])
        
        if not formula:
            log.error("No formula in config")
            return None
        
        # Build variable context from performance data
        context = {}
        for var in variables:
            if var in performance_data:
                context[var] = performance_data[var]
            else:
                log.warning(f"Variable {var} not found in performance data")
                context[var] = 0
        
        # Evaluate formula safely
        try:
            score = eval(formula, {"__builtins__": {}}, context)
        except Exception as e:
            log.error(f"Formula evaluation failed: {e}")
            return None
        
        # Determine pass/fail
        min_value = metric_definition.get("min_value", 0)
        max_value = metric_definition.get("max_value", 100)
        passed = min_value <= score <= max_value
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        log.info(
            f"Formula metric completed: {metric_definition['name']} - "
            f"Score: {score}, Passed: {passed}, Duration: {duration_ms}ms"
        )
        
        return {
            "metric_definition_id": metric_definition["id"],
            "metric_name": metric_definition["name"],
            "metric_type": "formula",
            "score": float(score),
            "passed": passed,
            "reasoning": f"Formula result: {score}",
            "metadata": {"formula": formula, "variables": context},
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
    task_id: str,
    agent_id: str,
    agent_name: str,
    parent_agent_id: str | None,
    workspace_id: str,
    agent_version: str,
    duration_ms: int,
    input_tokens: int,
    output_tokens: int,
    status: str,
    task_input: str,
    task_output: str,
) -> bool:
    """Save performance metrics to ClickHouse"""
    log.info(f"Ingesting performance metrics for task {task_id}")
    
    try:
        # Calculate cost (OpenAI GPT-4o pricing as default)
        cost_usd = (input_tokens * 0.0025 / 1000) + (output_tokens * 0.01 / 1000)
        
        client = get_clickhouse_client()
        
        client.command(
            """
            INSERT INTO task_performance_metrics (
                task_id, agent_id, agent_name, parent_agent_id, workspace_id,
                agent_version, duration_ms, input_tokens, output_tokens,
                cost_usd, status, task_input, task_output
            ) VALUES
            """,
            parameters={
                "task_id": task_id,
                "agent_id": agent_id,
                "agent_name": agent_name,
                "parent_agent_id": parent_agent_id,
                "workspace_id": workspace_id,
                "agent_version": agent_version,
                "duration_ms": duration_ms,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost_usd,
                "status": status,
                "task_input": task_input,
                "task_output": task_output,
            },
        )
        
        log.info(f"Performance metrics saved for task {task_id}")
        return True
        
    except Exception as e:
        log.error(f"Failed to ingest performance metrics: {e}")
        return False


@function.defn()
async def ingest_quality_metrics(
    task_id: str,
    agent_id: str,
    workspace_id: str,
    quality_results: list[dict[str, Any]],
) -> bool:
    """Save quality metrics to ClickHouse"""
    log.info(f"Ingesting {len(quality_results)} quality metrics for task {task_id}")
    
    try:
        if not quality_results:
            return True
        
        client = get_clickhouse_client()
        
        # Prepare batch insert
        rows = []
        for result in quality_results:
            rows.append({
                "task_id": task_id,
                "agent_id": agent_id,
                "workspace_id": workspace_id,
                "metric_definition_id": result["metric_definition_id"],
                "metric_name": result["metric_name"],
                "metric_type": result["metric_type"],
                "score": result["score"],
                "passed": result["passed"],
                "reasoning": result["reasoning"],
                "metadata": json.dumps(result["metadata"]),
                "eval_duration_ms": result["eval_duration_ms"],
                "eval_cost_usd": result["eval_cost_usd"],
            })
        
        client.insert(
            "task_quality_metrics",
            rows,
            column_names=[
                "task_id", "agent_id", "workspace_id", "metric_definition_id",
                "metric_name", "metric_type", "score", "passed", "reasoning",
                "metadata", "eval_duration_ms", "eval_cost_usd"
            ],
        )
        
        log.info(f"Quality metrics saved for task {task_id}")
        return True
        
    except Exception as e:
        log.error(f"Failed to ingest quality metrics: {e}")
        return False
