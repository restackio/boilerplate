"""Functions for querying traces from ClickHouse."""

import json
from typing import Any

from restack_ai.function import function, log

from src.database.connection import get_clickhouse_client


@function.defn()
async def get_task_traces_from_clickhouse(
    function_input: dict[str, Any],
) -> dict[str, Any]:
    """Fetch all trace spans for a given task from ClickHouse.

    Returns spans with full details plus summary statistics.
    """
    task_id = function_input["task_id"]

    log.info(
        f"Querying ClickHouse for traces with task_id: {task_id}"
    )

    try:
        client = get_clickhouse_client()

        # Query all spans for this task
        query = """
        SELECT
            trace_id,
            span_id,
            parent_span_id,
            task_id,
            agent_id,
            agent_name,
            workspace_id,
            agent_version,
            temporal_agent_id,
            temporal_run_id,
            span_type,
            span_name,
            duration_ms,
            status,
            model_name,
            input_tokens,
            output_tokens,
            cost_usd,
            input,
            output,
            metadata,
            error_message,
            error_type,
            started_at,
            ended_at
        FROM task_traces
        WHERE task_id = {task_id:UUID}
        ORDER BY started_at ASC
        """

        result = client.query(
            query, parameters={"task_id": task_id}
        )

        spans = []
        total_duration = 0
        total_tokens = 0
        total_cost = 0.0
        generation_count = 0
        function_count = 0

        for row in result.result_rows:
            # Parse metadata JSON if it exists
            metadata = {}
            if row[20]:  # metadata column
                try:
                    metadata = (
                        json.loads(row[20])
                        if isinstance(row[20], str)
                        else row[20]
                    )
                except (json.JSONDecodeError, TypeError):
                    metadata = {}

            span = {
                "trace_id": row[0],
                "span_id": row[1],
                "parent_span_id": row[2],
                "task_id": str(row[3]) if row[3] else None,
                "agent_id": str(row[4]) if row[4] else None,
                "agent_name": row[5],
                "workspace_id": str(row[6]) if row[6] else None,
                "agent_version": row[7],
                "temporal_agent_id": row[8],
                "temporal_run_id": row[9],
                "span_type": row[10],
                "span_name": row[11],
                "duration_ms": row[12],
                "status": row[13],
                "model_name": row[14],
                "input_tokens": row[15] or 0,
                "output_tokens": row[16] or 0,
                "cost_usd": float(row[17]) if row[17] else 0.0,
                "input": row[18],
                "output": row[19],
                "metadata": metadata,
                "error_message": row[21],
                "error_type": row[22],
                "started_at": row[23].isoformat()
                if row[23]
                else None,
                "ended_at": row[24].isoformat()
                if row[24]
                else None,
            }

            spans.append(span)

            # Calculate summary stats
            total_duration += row[12]
            total_tokens += (row[15] or 0) + (row[16] or 0)
            total_cost += float(row[17]) if row[17] else 0.0

            if row[10] == "generation":
                generation_count += 1
            elif row[10] == "function":
                function_count += 1

        log.info(
            f"Found {len(spans)} trace spans for task {task_id}"
        )

        return {
            "spans": spans,
            "summary": {
                "total_spans": len(spans),
                "total_duration_ms": total_duration,
                "total_tokens": total_tokens,
                "total_cost_usd": round(total_cost, 6),
                "generation_spans": generation_count,
                "function_spans": function_count,
            },
        }

    except Exception as e:
        log.error(f"Error querying traces from ClickHouse: {e}")
        raise
