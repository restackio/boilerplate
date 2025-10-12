"""Analytics Functions.

Consolidated, efficient analytics queries with parallel execution.
"""
# ruff: noqa: S608

import uuid
from typing import Any, Literal

from restack_ai.function import function, log
from sqlalchemy import and_, select

from src.database.connection import get_async_db
from src.functions.analytics_helpers import (
    AnalyticsFilters,
    build_filter_clause,
    parse_date_range,
)
from src.functions.data_ingestion import get_clickhouse_client

MetricType = Literal["performance", "quality", "overview", "all"]


@function.defn()
async def get_analytics_metrics(
    input_data: dict[str, Any],
) -> dict[str, Any]:
    """Fetches all analytics metrics in parallel.

    Args:
        input_data: {
            workspace_id: str,
            agent_id: Optional[str],
            version: Optional[str],
            date_range: "1d" | "7d" | "30d" | "90d",
            metric_types: List["performance" | "quality" | "overview"] | "all"
        }

    Returns:
        {
            performance: {
                summary: {...},
                timeseries: [...]
            },
            quality: {
                summary: [...],
                timeseries: [...]
            },
            overview: {
                timeseries: [...]
            }
        }
    """
    # Extract metric_types before creating AnalyticsFilters
    metric_types = input_data.get("metric_types", "all")

    # Remove metric_types from input_data before passing to AnalyticsFilters
    filter_data = {
        k: v for k, v in input_data.items() if k != "metric_types"
    }
    filters = AnalyticsFilters(**filter_data)

    # Determine which metrics to fetch
    fetch_all = metric_types == "all"
    fetch_performance = fetch_all or "performance" in metric_types
    fetch_quality = fetch_all or "quality" in metric_types
    fetch_overview = fetch_all or "overview" in metric_types
    fetch_feedback = fetch_all or "feedback" in metric_types

    log.info(
        f"Fetching analytics for workspace {filters.workspace_id}, types: {metric_types}"
    )

    result = {}

    try:
        client = get_clickhouse_client()

        # Performance metrics (parallel queries)
        if fetch_performance:
            result[
                "performance"
            ] = await _get_performance_metrics(client, filters)

        # Quality metrics (parallel queries)
        if fetch_quality:
            result["quality"] = await _get_quality_metrics(
                client, filters
            )

        # Overview (task counts & success rates)
        if fetch_overview:
            result["overview"] = await _get_overview_metrics(
                client, filters
            )

        # Feedback metrics
        if fetch_feedback:
            result["feedback"] = await _get_feedback_metrics(
                client, filters
            )

        # Apply demo multipliers if enabled
        from src.utils.demo import (
            apply_demo_multiplier_to_analytics,
        )

        return apply_demo_multiplier_to_analytics(result)

    except (
        ValueError,
        TypeError,
        RuntimeError,
        AttributeError,
        ConnectionError,
        OSError,
    ) as e:
        log.error(f"Failed to fetch analytics metrics: {e}")
        # Return partial results if available
        return result


async def _get_performance_metrics(
    client: Any, filters: AnalyticsFilters
) -> dict[str, Any]:
    """Fetch performance metrics (summary + timeseries) in one query."""
    where_clause, params = build_filter_clause(
        filters,
        include_version=True,
        additional_filters=["status = 'completed'"],
    )

    days = parse_date_range(filters.date_range)

    # Combined query for both summary and timeseries with full date range
    query = (
        f"""
        WITH date_range AS (
            SELECT
                toDate(now() - INTERVAL number DAY) as date
            FROM numbers({days})
        ),
        metrics AS (
            SELECT
                toDate(created_at) as date,
                avg(duration_ms) as avg_duration,
                avg(input_tokens + output_tokens) as avg_tokens,
                sum(cost_usd) as total_cost,
                count(*) as task_count
            FROM task_metrics
            WHERE metric_category = 'performance' AND """
        + where_clause
        + """
            GROUP BY date
        )
        SELECT
            dr.date as date,
            coalesce(m.avg_duration, 0) as avg_duration,
            coalesce(m.avg_tokens, 0) as avg_tokens,
            coalesce(m.total_cost, 0) as total_cost,
            coalesce(m.task_count, 0) as task_count
        FROM date_range dr
        LEFT JOIN metrics m ON dr.date = m.date
        ORDER BY dr.date ASC
    """
    )

    result = client.query(query, parameters=params)
    rows = list(result.named_results())

    if not rows:
        return {
            "summary": {
                "avgDuration": 0,
                "avgTokens": 0,
                "totalCost": 0,
                "taskCount": 0,
            },
            "timeseries": [],
        }

    # Calculate summary (aggregate across all dates)
    total_duration = sum(
        r["avg_duration"] * r["task_count"]
        for r in rows
        if r["avg_duration"]
    )
    total_tokens = sum(
        r["avg_tokens"] * r["task_count"]
        for r in rows
        if r["avg_tokens"]
    )
    total_cost = sum(
        r["total_cost"] for r in rows if r["total_cost"]
    )
    total_tasks = sum(r["task_count"] for r in rows)

    summary = {
        "avgDuration": round(total_duration / total_tasks, 2)
        if total_tasks > 0
        else 0,
        "avgTokens": round(total_tokens / total_tasks, 2)
        if total_tasks > 0
        else 0,
        "totalCost": round(total_cost, 4),
        "taskCount": total_tasks,
    }

    # Build timeseries
    timeseries = [
        {
            "date": str(r["date"]),
            "avgDuration": round(r["avg_duration"], 2)
            if r["avg_duration"]
            else 0,
            "avgTokens": round(r["avg_tokens"], 2)
            if r["avg_tokens"]
            else 0,
            "totalCost": round(r["total_cost"], 4)
            if r["total_cost"]
            else 0,
        }
        for r in rows
    ]

    return {"summary": summary, "timeseries": timeseries}


async def _get_quality_metrics(
    client: Any, filters: AnalyticsFilters
) -> dict[str, Any]:
    """Fetch quality metrics (summary + timeseries) in one query."""
    where_clause, params = build_filter_clause(filters)

    days = parse_date_range(filters.date_range)

    query = (
        f"""
        WITH date_range AS (
            SELECT
                toDate(now() - INTERVAL number DAY) as date
            FROM numbers({days})
        ),
        metric_names AS (
            SELECT DISTINCT metric_name
            FROM task_metrics
            WHERE metric_category = 'quality' AND """
        + where_clause
        + """
        ),
        date_metric_cross AS (
            SELECT dr.date, mn.metric_name
            FROM date_range dr
            CROSS JOIN metric_names mn
        ),
        metrics AS (
            SELECT
                metric_name,
                toDate(created_at) as date,
                countIf(passed = true) as passed_count,
                count(*) as eval_count,
                avg(score) as avg_score
            FROM task_metrics
            WHERE metric_category = 'quality' AND """
        + where_clause
        + """
                GROUP BY metric_name, date
        )
        SELECT
            dmc.metric_name,
            dmc.date,
            if(m.eval_count > 0, (m.eval_count - m.passed_count) / m.eval_count, 0) as fail_rate,
            coalesce(m.avg_score, 0) as avg_score,
            coalesce(m.eval_count, 0) as eval_count
        FROM date_metric_cross dmc
        LEFT JOIN metrics m ON dmc.date = m.date AND dmc.metric_name = m.metric_name
        ORDER BY dmc.metric_name, dmc.date ASC
    """
    )

    result = client.query(query, parameters=params)
    rows = list(result.named_results())

    if not rows:
        return {"summary": [], "timeseries": []}

    # Build summary (aggregate by metric_name across all dates)
    summary_dict = {}
    for row in rows:
        metric_name = row["metric_name"]
        if metric_name not in summary_dict:
            summary_dict[metric_name] = {
                "metricName": metric_name,
                "failRate": 0,
                "avgScore": 0,
                "evaluationCount": 0,
            }
        summary_dict[metric_name]["failRate"] += (
            row["fail_rate"] * row["eval_count"]
        )
        if row["avg_score"] is not None:
            summary_dict[metric_name]["avgScore"] += (
                row["avg_score"] * row["eval_count"]
            )
        summary_dict[metric_name]["evaluationCount"] += row[
            "eval_count"
        ]

    # Fetch metric definitions from PostgreSQL for additional metadata
    from src.database.models import MetricDefinition
    async for db in get_async_db():
        try:
            metric_defs_query = select(MetricDefinition).where(
                and_(
                    MetricDefinition.workspace_id == uuid.UUID(filters.workspace_id),
                    MetricDefinition.metric_name.in_(list(summary_dict.keys()))
                )
            )
            metric_defs_result = await db.execute(metric_defs_query)
            metric_defs = metric_defs_result.scalars().all()

            # Create lookup dict
            metric_defs_lookup = {
                metric_def.metric_name: {
                    "metricId": str(metric_def.id),
                    "isDefault": False,  # Custom metrics from DB are not default
                    "isActive": metric_def.is_active,
                    "config": metric_def.config or {},
                }
                for metric_def in metric_defs
            }
        except (ValueError, TypeError, RuntimeError, AttributeError, ConnectionError, OSError) as e:
            log.error(f"Failed to fetch metric definitions: {e}")
            metric_defs_lookup = {}
        break

    # Normalize averages and add metadata
    summary = []
    for metric_name, data in summary_dict.items():
        count = data["evaluationCount"]
        metric_metadata = metric_defs_lookup.get(metric_name, {
            "metricId": "",
            "isDefault": True,  # If not in DB, assume it's a default metric
            "isActive": True,
            "config": {},
        })

        summary.append(
            {
                "metricName": metric_name,
                "metricId": metric_metadata["metricId"],
                "isDefault": metric_metadata["isDefault"],
                "isActive": metric_metadata["isActive"],
                "config": metric_metadata["config"],
                "failRate": round(data["failRate"] / count, 3)
                if count > 0
                else 0,
                "avgScore": round(data["avgScore"] / count, 2)
                if count > 0 and data["avgScore"] > 0
                else None,
                "evaluationCount": count,
            }
        )

    # Build timeseries
    timeseries = []
    for row in rows:
        metric = {
            "date": str(row["date"]),
            "metricName": row["metric_name"],
            "failRate": round(row["fail_rate"], 3)
            if row["fail_rate"]
            else 0,
        }
        if row["avg_score"] is not None:
            metric["avgScore"] = round(row["avg_score"], 2)
        timeseries.append(metric)

    return {"summary": summary, "timeseries": timeseries}


async def _get_overview_metrics(
    client: Any, filters: AnalyticsFilters
) -> dict[str, Any]:
    """Fetch overview metrics (task counts & fail rates)."""
    where_clause, params = build_filter_clause(
        filters, include_version=True
    )

    days = parse_date_range(filters.date_range)

    query = (
        f"""
        WITH date_range AS (
            SELECT
                toDate(now() - INTERVAL number DAY) as date
            FROM numbers({days})
        ),
        metrics AS (
            SELECT
                toDate(created_at) as date,
                count(*) as task_count,
                countIf(status = 'completed') as completed_count
            FROM task_metrics
            WHERE metric_category = 'performance' AND """
        + where_clause
        + """
            GROUP BY date
        )
        SELECT
            dr.date as date,
            coalesce(m.task_count, 0) as task_count,
            if(m.task_count > 0, (m.task_count - m.completed_count) / m.task_count, 0) as fail_rate
        FROM date_range dr
        LEFT JOIN metrics m ON dr.date = m.date
        ORDER BY dr.date ASC
    """
    )

    result = client.query(query, parameters=params)

    timeseries = [
        {
            "date": str(row["date"]),
            "taskCount": int(row["task_count"]),
            "failRate": round(row["fail_rate"], 3)
            if row["fail_rate"]
            else 0,
        }
        for row in result.named_results()
    ]

    return {"timeseries": timeseries}


async def _get_feedback_metrics(
    client: Any, filters: AnalyticsFilters
) -> dict[str, Any]:
    """Get feedback metrics timeseries with task counts for proper coverage calculation.

    Returns only timeseries data - frontend calculates summaries from it.
    """
    # Get base filter for tasks
    task_where_filter, task_params = build_filter_clause(
        filters, include_version=True
    )

    # Feedback-specific filter
    feedback_where_filter, feedback_params = build_filter_clause(
        filters
    )
    feedback_where_filter += " AND metric_category = 'feedback'"

    days = parse_date_range(filters.date_range)

    # Combined timeseries query with task counts and feedback including full date range
    timeseries_query = (
        f"""
        WITH date_range AS (
            SELECT
                toDate(now() - INTERVAL number DAY) as date
            FROM numbers({days})
        ),
        task_counts AS (
            SELECT
                toDate(created_at) as date,
                count(DISTINCT task_id) as total_tasks
            FROM task_metrics
            WHERE metric_category = 'performance' AND """
        + task_where_filter
        + """
            GROUP BY date
        ),
        feedback_counts AS (
            SELECT
                toDate(created_at) as date,
                countIf(passed = 1) as positive_count,
                countIf(passed = 0) as negative_count,
                count() as feedback_count,
                count(DISTINCT task_id) as tasks_with_feedback
            FROM task_metrics
            WHERE """
        + feedback_where_filter
        + """
            GROUP BY date
        )
        SELECT
            dr.date as date,
            COALESCE(t.total_tasks, 0) as total_tasks,
            COALESCE(f.positive_count, 0) as positive_count,
            COALESCE(f.negative_count, 0) as negative_count,
            COALESCE(f.feedback_count, 0) as feedback_count,
            COALESCE(f.tasks_with_feedback, 0) as tasks_with_feedback
        FROM date_range dr
        LEFT JOIN task_counts t ON dr.date = t.date
        LEFT JOIN feedback_counts f ON dr.date = f.date
        ORDER BY date ASC
    """
    )

    # Merge params from both filters
    merged_params = {**task_params, **feedback_params}
    result = client.query(
        timeseries_query, parameters=merged_params
    )

    timeseries = [
        {
            "date": str(row["date"]),
            "totalTasks": int(row["total_tasks"]),
            "tasksWithFeedback": int(row["tasks_with_feedback"]),
            "positiveCount": int(row["positive_count"]),
            "negativeCount": int(row["negative_count"]),
            "feedbackCount": int(row["feedback_count"]),
            "feedbackCoverage": round(
                (
                    int(row["tasks_with_feedback"])
                    / int(row["total_tasks"])
                    * 100
                ),
                1,
            )
            if int(row["total_tasks"]) > 0
            else 0,
        }
        for row in result.named_results()
    ]

    # Get detailed feedback entries (last 50)
    detailed_query = (
        """
        SELECT
            task_id,
            passed as is_positive,
            reasoning as comment,
            created_at
        FROM task_metrics
        WHERE """
        + feedback_where_filter
        + """
        ORDER BY created_at DESC
        LIMIT 50
    """
    )

    detailed_result = client.query(
        detailed_query, parameters=feedback_params
    )

    detailed_feedbacks = [
        {
            "taskId": row["task_id"],
            "isPositive": bool(row["is_positive"]),
            "comment": row["comment"] if row["comment"] else None,
            "createdAt": str(row["created_at"]),
        }
        for row in detailed_result.named_results()
    ]

    return {
        "timeseries": timeseries,
        "detailed": detailed_feedbacks,
    }
