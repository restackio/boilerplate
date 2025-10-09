"""Analytics Functions.

Consolidated, efficient analytics queries with parallel execution.
"""

from typing import Any, Literal

from restack_ai.function import function, log

from src.functions.analytics_helpers import (
    AnalyticsFilters,
    build_filter_clause,
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

        return result

    except Exception as e:
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

    # Combined query for both summary and timeseries
    query = f"""
        SELECT
            -- Summary metrics
            avg(duration_ms) as avg_duration,
            avg(input_tokens + output_tokens) as avg_tokens,
            sum(cost_usd) as total_cost,
            count(*) as task_count,

            -- Timeseries grouping
            toDate(created_at) as date
        FROM task_metrics
        WHERE metric_category = 'performance' AND {where_clause}
        GROUP BY date
        ORDER BY date ASC
    """

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

    query = f"""
        SELECT
            metric_name,
            toDate(created_at) as date,
            countIf(passed = true) / count(*) as pass_rate,
            avg(score) as avg_score,
            count(*) as eval_count
        FROM task_metrics
        WHERE metric_category = 'quality' AND {where_clause}
        GROUP BY metric_name, date
        ORDER BY metric_name, date ASC
    """

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
                "passRate": 0,
                "avgScore": 0,
                "evaluationCount": 0,
            }
        summary_dict[metric_name]["passRate"] += (
            row["pass_rate"] * row["eval_count"]
        )
        if row["avg_score"] is not None:
            summary_dict[metric_name]["avgScore"] += (
                row["avg_score"] * row["eval_count"]
            )
        summary_dict[metric_name]["evaluationCount"] += row[
            "eval_count"
        ]

    # Normalize averages
    summary = []
    for metric_name, data in summary_dict.items():
        count = data["evaluationCount"]
        summary.append(
            {
                "metricName": metric_name,
                "passRate": round(data["passRate"] / count, 3)
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
            "passRate": round(row["pass_rate"], 3)
            if row["pass_rate"]
            else 0,
        }
        if row["avg_score"] is not None:
            metric["avgScore"] = round(row["avg_score"], 2)
        timeseries.append(metric)

    return {"summary": summary, "timeseries": timeseries}


async def _get_overview_metrics(
    client: Any, filters: AnalyticsFilters
) -> dict[str, Any]:
    """Fetch overview metrics (task counts & success rates)."""
    where_clause, params = build_filter_clause(
        filters, include_version=True
    )

    query = f"""
        SELECT
            toDate(created_at) as date,
            count(*) as task_count,
            countIf(status = 'completed') / count(*) as success_rate
        FROM task_metrics
        WHERE metric_category = 'performance' AND {where_clause}
        GROUP BY date
        ORDER BY date ASC
    """

    result = client.query(query, parameters=params)

    timeseries = [
        {
            "date": str(row["date"]),
            "taskCount": int(row["task_count"]),
            "successRate": round(row["success_rate"], 3)
            if row["success_rate"]
            else 0,
        }
        for row in result.named_results()
    ]

    return {"timeseries": timeseries}


async def _get_feedback_metrics(
    client: Any, filters: AnalyticsFilters
) -> dict[str, Any]:
    """Get feedback metrics (positive/negative feedback over time)."""
    where_filter, params = build_filter_clause(filters)
    where_filter += " AND metric_category = 'feedback'"

    # Timeseries query
    timeseries_query = f"""
        SELECT
            toDate(created_at) as date,
            countIf(passed = 1) as positive_count,
            countIf(passed = 0) as negative_count,
            count() as total_count,
            if(count() > 0, (countIf(passed = 0) * 100.0 / count()), 0) as negative_percentage
        FROM task_metrics
        WHERE {where_filter}
        GROUP BY date
        ORDER BY date ASC
    """

    result = client.query(timeseries_query, parameters=params)

    timeseries = [
        {
            "date": str(row["date"]),
            "positiveCount": int(row["positive_count"]),
            "negativeCount": int(row["negative_count"]),
            "totalCount": int(row["total_count"]),
            "negativePercentage": round(row["negative_percentage"], 1),
        }
        for row in result.named_results()
    ]

    # Summary query
    summary_query = f"""
        SELECT
            countIf(passed = 1) as total_positive,
            countIf(passed = 0) as total_negative,
            count() as total_feedback,
            if(count() > 0, (countIf(passed = 0) * 100.0 / count()), 0) as negative_percentage,
            if(count() > 0, (countIf(passed = 1) * 100.0 / count()), 0) as positive_percentage
        FROM task_metrics
        WHERE {where_filter}
    """

    summary_result = client.query(summary_query, parameters=params)
    summary_row = next(iter(summary_result.named_results())) if summary_result.named_results() else None

    summary = {
        "totalPositive": int(summary_row["total_positive"]) if summary_row else 0,
        "totalNegative": int(summary_row["total_negative"]) if summary_row else 0,
        "totalFeedback": int(summary_row["total_feedback"]) if summary_row else 0,
        "negativePercentage": round(summary_row["negative_percentage"], 1) if summary_row else 0,
        "positivePercentage": round(summary_row["positive_percentage"], 1) if summary_row else 0,
    }

    return {"summary": summary, "timeseries": timeseries}
