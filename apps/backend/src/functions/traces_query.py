"""Functions for querying traces with flexible filters.

These functions support both real-time metrics derivation and retroactive evaluation.
"""

from typing import Any

from restack_ai.function import function, log

from src.database.connection import get_clickhouse_async_client


@function.defn()
async def query_traces_for_response(
    function_input: dict[str, Any],
) -> dict[str, Any]:
    """Query traces for a specific task response.

    Used by TaskMetricsWorkflow to derive performance metrics from traces.

    Args:
        function_input: Dict with task_id and optional response_id

    Returns:
        Dict with generation span data and summary
    """
    task_id = function_input["task_id"]
    response_id = function_input.get("response_id")

    log.info(
        f"Querying traces for task {task_id}, response {response_id}"
    )

    try:
        client = await get_clickhouse_async_client()

        # Query for response span (the LLM call)
        # If response_id provided, filter by it in metadata
        where_clause = "WHERE task_id = {task_id:UUID} AND span_type = 'response'"
        if response_id:
            # For native JSON type in ClickHouse, use dot notation
            where_clause += (
                " AND metadata.response_id = {response_id:String}"
            )

        query = (
            """
        SELECT
            trace_id,
            span_id,
            parent_span_id,
            task_id,
            agent_id,
            agent_name,
            workspace_id,
            agent_version,
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
            started_at,
            ended_at
        FROM task_traces
        """
            + where_clause
            + """
        ORDER BY started_at DESC
        LIMIT 1
        """
        )

        params = {"task_id": task_id}
        if response_id:
            params["response_id"] = response_id

        result = await client.query(query, parameters=params)

        if not result.result_rows:
            log.warning(
                f"No generation span found for task {task_id}, response {response_id}"
            )
            return {
                "found": False,
                "trace_id": None,
                "span": None,
            }

        row = result.result_rows[0]

        # Parse metadata JSON
        import json

        metadata = {}
        if row[18]:
            try:
                metadata = (
                    json.loads(row[18])
                    if isinstance(row[18], str)
                    else row[18]
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
            "span_type": row[8],
            "span_name": row[9],
            "duration_ms": row[10],
            "status": row[11],
            "model_name": row[12],
            "input_tokens": row[13] or 0,
            "output_tokens": row[14] or 0,
            "cost_usd": float(row[15]) if row[15] else 0.0,
            "input": row[16],
            "output": row[17],
            "metadata": metadata,
            "started_at": row[19].isoformat()
            if row[19]
            else None,
            "ended_at": row[20].isoformat() if row[20] else None,
        }

        log.info(
            f"Found generation span {span['span_id']} for task {task_id}"
        )

        return {
            "found": True,
            "trace_id": row[0],
            "span_id": row[1],
            "span": span,
            # Extracted performance data for convenience:
            "performance": {
                "duration_ms": row[10],
                "input_tokens": row[13] or 0,
                "output_tokens": row[14] or 0,
                "cost_usd": float(row[15]) if row[15] else 0.0,
                "input": row[16],
                "output": row[17],
            },
        }

    except Exception as e:
        log.error(f"Error querying traces: {e}")
        raise


@function.defn()
async def query_traces_batch(
    function_input: dict[str, Any],
) -> dict[str, Any]:
    """Query traces in batches for retroactive evaluation.

    Supports filtering by workspace, agent, date range, etc.

    Args:
        function_input: Dict with workspace_id, filters, limit, offset

    Returns:
        Dict with spans array and pagination info
    """
    workspace_id = function_input["workspace_id"]
    filters = function_input.get("filters", {})
    limit = function_input.get("limit", 100)
    offset = function_input.get("offset", 0)

    log.info(
        f"Querying trace batch for workspace {workspace_id}, offset {offset}"
    )

    try:
        client = await get_clickhouse_async_client()

        # Build WHERE clause from filters
        where_conditions = ["workspace_id = {workspace_id:UUID}"]
        params = {"workspace_id": workspace_id}

        if filters.get("agent_id"):
            where_conditions.append("agent_id = {agent_id:UUID}")
            params["agent_id"] = filters["agent_id"]

        if filters.get("agent_version"):
            where_conditions.append(
                "agent_version = {agent_version:String}"
            )
            params["agent_version"] = filters["agent_version"]

        if filters.get("date_from"):
            where_conditions.append(
                "started_at >= {date_from:String}"
            )
            # Remove 'Z' suffix if present for ClickHouse compatibility
            date_from_str = (
                filters["date_from"]
                .replace("Z", "")
                .replace("T", " ")
            )
            params["date_from"] = date_from_str

        if filters.get("date_to"):
            where_conditions.append(
                "started_at <= {date_to:String}"
            )
            # Remove 'Z' suffix if present for ClickHouse compatibility
            date_to_str = (
                filters["date_to"]
                .replace("Z", "")
                .replace("T", " ")
            )
            params["date_to"] = date_to_str

        # Only response spans (for quality evaluation)
        where_conditions.append("span_type = 'response'")

        where_clause = " AND ".join(where_conditions)

        query = (
            """
        SELECT
            trace_id,
            span_id,
            task_id,
            agent_id,
            agent_name,
            workspace_id,
            agent_version,
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
            started_at,
            ended_at
        FROM task_traces
        WHERE """
            + where_clause
            + """
        ORDER BY started_at DESC
        LIMIT {limit:UInt32}
        OFFSET {offset:UInt32}
        """
        )

        params["limit"] = limit
        params["offset"] = offset

        result = await client.query(query, parameters=params)

        spans = []
        for row in result.result_rows:
            # Parse metadata
            import json

            metadata = {}
            if row[17]:
                try:
                    metadata = (
                        json.loads(row[17])
                        if isinstance(row[17], str)
                        else row[17]
                    )
                except (json.JSONDecodeError, TypeError):
                    metadata = {}

            spans.append(
                {
                    "trace_id": row[0],
                    "span_id": row[1],
                    "task_id": str(row[2]) if row[2] else None,
                    "agent_id": str(row[3]) if row[3] else None,
                    "agent_name": row[4],
                    "workspace_id": str(row[5])
                    if row[5]
                    else None,
                    "agent_version": row[6],
                    "span_type": row[7],
                    "span_name": row[8],
                    "duration_ms": row[9],
                    "status": row[10],
                    "model_name": row[11],
                    "input_tokens": row[12] or 0,
                    "output_tokens": row[13] or 0,
                    "cost_usd": float(row[14])
                    if row[14]
                    else 0.0,
                    "input": row[15],
                    "output": row[16],
                    "metadata": metadata,
                    "started_at": row[18].isoformat()
                    if row[18]
                    else None,
                    "ended_at": row[19].isoformat()
                    if row[19]
                    else None,
                }
            )

        log.info(f"Retrieved {len(spans)} traces for batch")

        return {
            "spans": spans,
            "count": len(spans),
            "has_more": len(spans) == limit,
            "next_offset": offset + len(spans),
        }

    except Exception as e:
        log.error(f"Error querying trace batch: {e}")
        raise


@function.defn()
async def aggregate_traces_for_task(
    function_input: dict[str, Any],
) -> dict[str, Any]:
    """Aggregate all traces for a task to compute overall performance.

    Useful for getting task-level metrics from multiple LLM calls.

    Args:
        function_input: Dict with task_id

    Returns:
        Dict with aggregated metrics
    """
    task_id = function_input["task_id"]

    log.info(f"Aggregating traces for task {task_id}")

    try:
        client = await get_clickhouse_async_client()

        query = """
        SELECT
            count() as total_spans,
            countIf(span_type = 'response') as response_count,
            countIf(span_type = 'function') as function_count,
            sum(duration_ms) as total_duration_ms,
            sum(input_tokens) as total_input_tokens,
            sum(output_tokens) as total_output_tokens,
            sum(cost_usd) as total_cost_usd,
            countIf(status = 'error') as error_count,
            min(started_at) as first_started_at,
            max(ended_at) as last_ended_at
        FROM task_traces
        WHERE task_id = {task_id:UUID}
        """

        result = await client.query(
            query, parameters={"task_id": task_id}
        )

        if not result.result_rows:
            return {
                "found": False,
                "task_id": task_id,
            }

        row = result.result_rows[0]

        return {
            "found": True,
            "task_id": task_id,
            "total_spans": row[0],
            "response_count": row[1],
            "function_count": row[2],
            "total_duration_ms": row[3] or 0,
            "total_input_tokens": row[4] or 0,
            "total_output_tokens": row[5] or 0,
            "total_tokens": (row[4] or 0) + (row[5] or 0),
            "total_cost_usd": float(row[6]) if row[6] else 0.0,
            "error_count": row[7],
            "first_started_at": row[8].isoformat()
            if row[8]
            else None,
            "last_ended_at": row[9].isoformat()
            if row[9]
            else None,
        }

    except Exception as e:
        log.error(f"Error aggregating traces: {e}")
        raise


@function.defn()
async def count_traces_for_retroactive(
    function_input: dict[str, Any],
) -> dict[str, Any]:
    """Count traces matching retroactive evaluation filters.

    Used to show progress on the frontend before starting evaluation.

    Args:
        function_input: Dict with workspace_id and filters

    Returns:
        Dict with total_count of matching traces
    """
    workspace_id = function_input["workspace_id"]
    filters = function_input.get("filters", {})

    log.info(
        f"Counting traces for workspace {workspace_id} with filters {filters}"
    )

    try:
        client = await get_clickhouse_async_client()

        # Build WHERE clause (same logic as query_traces_batch)
        where_conditions = ["workspace_id = {workspace_id:UUID}"]
        params = {"workspace_id": workspace_id}

        if filters.get("agent_id"):
            where_conditions.append("agent_id = {agent_id:UUID}")
            params["agent_id"] = filters["agent_id"]

        if filters.get("agent_version"):
            where_conditions.append(
                "agent_version = {agent_version:String}"
            )
            params["agent_version"] = filters["agent_version"]

        if filters.get("date_from"):
            where_conditions.append(
                "started_at >= {date_from:String}"
            )
            date_from_str = (
                filters["date_from"]
                .replace("Z", "")
                .replace("T", " ")
            )
            params["date_from"] = date_from_str

        if filters.get("date_to"):
            where_conditions.append(
                "started_at <= {date_to:String}"
            )
            date_to_str = (
                filters["date_to"]
                .replace("Z", "")
                .replace("T", " ")
            )
            params["date_to"] = date_to_str

        # Only response spans (for quality evaluation)
        where_conditions.append("span_type = 'response'")

        where_clause = " AND ".join(where_conditions)

        query = (
            "SELECT COUNT(*) as total "
            "FROM task_traces "
            "WHERE " + where_clause
        )

        result = await client.query(query, parameters=params)

        if not result.result_rows:
            return {"total_count": 0}

        total_count = result.result_rows[0][0]

        log.info(f"Found {total_count} traces matching filters")

    except Exception as e:
        log.error(f"Error counting traces: {e}")
        raise
    else:
        return {"total_count": total_count}
