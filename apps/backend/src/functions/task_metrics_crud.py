"""Task Metrics Operations.

Functions to fetch and manage all task metrics from ClickHouse.
"""

from restack_ai.function import function, log


@function.defn()
async def get_task_metrics_clickhouse(
    input_data: dict,
) -> dict:
    """Fetch all metrics for a task from ClickHouse (quality + performance).

    Returns a dict with:
    - performance: list of performance metric records
    - quality: list of quality metric records
    """
    from src.database.connection import (
        get_clickhouse_async_client,
    )

    task_id = input_data.get("task_id")
    log.info(
        f"Querying ClickHouse for all task metrics: task_id={task_id}"
    )

    try:
        client = await get_clickhouse_async_client()

        # Single unified query - much simpler!
        # Note: task_input/task_output excluded - they're stored for retroactive evaluation but not returned
        query = """
            SELECT
                metric_category,
                -- Common fields
                agent_name,
                agent_version,
                response_id,
                response_index,
                message_count,
                formatDateTime(created_at, '%Y-%m-%dT%H:%i:%S') as created_at,
                -- Performance fields
                duration_ms,
                input_tokens,
                output_tokens,
                cost_usd,
                status,
                -- Quality fields
                metric_name,
                metric_type,
                passed,
                score,
                reasoning,
                eval_duration_ms,
                eval_cost_usd
            FROM task_metrics
            WHERE task_id = {task_id:UUID}
            ORDER BY metric_category, response_index ASC NULLS FIRST, created_at ASC
        """

        result = await client.query(
            query, parameters={"task_id": task_id}
        )

        performance_metrics = []
        quality_metrics = []

        for row in result.named_results():
            if row["metric_category"] == "performance":
                performance_metrics.append(
                    {
                        "metricCategory": "performance",
                        "agentName": row["agent_name"],
                        "agentVersion": row["agent_version"],
                        "durationMs": row["duration_ms"],
                        "inputTokens": row["input_tokens"],
                        "outputTokens": row["output_tokens"],
                        "costUsd": row["cost_usd"],
                        "status": row["status"],
                        "createdAt": row["created_at"],
                        "responseId": row["response_id"],
                        "responseIndex": row["response_index"],
                        "messageCount": row["message_count"],
                    }
                )
            elif row["metric_category"] == "quality":
                quality_metrics.append(
                    {
                        "metricCategory": "quality",
                        "metricName": row["metric_name"],
                        "metricType": row["metric_type"],
                        "passed": row["passed"],
                        "score": row["score"],
                        "reasoning": row["reasoning"],
                        "evalDurationMs": row["eval_duration_ms"],
                        "evalCostUsd": row["eval_cost_usd"],
                        "createdAt": row["created_at"],
                        "responseId": row["response_id"],
                        "responseIndex": row["response_index"],
                        "messageCount": row["message_count"],
                    }
                )

        log.info(
            f"Found {len(performance_metrics)} performance + {len(quality_metrics)} quality metrics for task {task_id}"
        )

    except (
        ValueError,
        TypeError,
        RuntimeError,
        AttributeError,
        ConnectionError,
        OSError,
    ) as e:
        log.error(
            f"Failed to query ClickHouse for task metrics: {e}"
        )
        return {"performance": [], "quality": []}
    else:
        return {
            "performance": performance_metrics,
            "quality": quality_metrics,
        }
