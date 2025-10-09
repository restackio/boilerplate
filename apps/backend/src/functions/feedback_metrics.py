"""Feedback Metrics Functions.

Functions to save and query user feedback on agent responses.
"""

from typing import Any

from pydantic import BaseModel
from restack_ai.function import function, log

from src.database.connection import get_clickhouse_client


class IngestFeedbackMetricInput(BaseModel):
    """Input for submitting feedback on an agent response."""
    task_id: str
    agent_id: str
    workspace_id: str
    response_id: str  # OpenAI response ID
    response_index: int  # Which response in conversation
    message_count: int  # Total messages at time of feedback
    feedback_type: str  # 'positive' or 'negative'
    feedback_text: str | None = None  # Optional detailed feedback
    user_id: str | None = None  # Optional user ID
    # Link to traces
    trace_id: str | None = None
    span_id: str | None = None


class GetTaskFeedbackInput(BaseModel):
    """Input for querying feedback for a task."""
    task_id: str


class GetFeedbackAnalyticsInput(BaseModel):
    """Input for querying feedback analytics."""
    workspace_id: str
    agent_id: str | None = None
    date_range: str = "7d"  # 7d, 30d, 90d


@function.defn()
async def ingest_feedback_metric(
    input_data: IngestFeedbackMetricInput,
) -> bool:
    """Save user feedback to ClickHouse as a metric.

    Args:
        input_data: Feedback data including task_id, response_id, feedback_type, etc.

    Returns:
        True if successful
    """
    log.info(
        f"Ingesting feedback metric for task {input_data.task_id}, "
        f"response {input_data.response_id}: {input_data.feedback_type}"
    )

    try:
        client = get_clickhouse_client()

        # Define column names for unified table
        column_names = [
            "task_id",
            "agent_id",
            "workspace_id",
            "metric_category",
            "metric_name",
            "metric_type",
            "response_id",
            "response_index",
            "message_count",
            "passed",  # positive = True, negative = False
            "reasoning",  # Detailed feedback text
            "trace_id",
            "span_id",
        ]

        # Prepare data row
        row_data = [
            input_data.task_id,
            input_data.agent_id,
            input_data.workspace_id,
            "feedback",  # metric_category
            "user_feedback",  # metric_name
            input_data.feedback_type,  # metric_type: 'positive' or 'negative'
            input_data.response_id,
            input_data.response_index,
            input_data.message_count,
            input_data.feedback_type == "positive",  # passed
            input_data.feedback_text,  # reasoning (feedback text)
            input_data.trace_id,
            input_data.span_id,
        ]

        client.insert(
            "task_metrics",
            [row_data],
            column_names=column_names,
        )

        log.info(
            f"Feedback metric saved for task {input_data.task_id}"
        )
        return True

    except Exception as e:
        log.error(f"Failed to ingest feedback metric: {e}")
        import traceback
        log.error(traceback.format_exc())
        raise


@function.defn()
async def get_task_feedback(
    input_data: GetTaskFeedbackInput,
) -> list[dict[str, Any]]:
    """Get all feedback for a specific task.

    Args:
        input_data: Contains task_id

    Returns:
        List of feedback records
    """
    log.info(f"Querying feedback for task {input_data.task_id}")

    try:
        client = get_clickhouse_client()

        query = """
            SELECT
                response_id,
                response_index,
                message_count,
                metric_type as feedback_type,
                passed as is_positive,
                reasoning as feedback_text,
                formatDateTime(created_at, '%Y-%m-%dT%H:%M:%S') as created_at,
                trace_id,
                span_id
            FROM task_metrics
            WHERE task_id = {task_id:UUID}
                AND metric_category = 'feedback'
            ORDER BY created_at DESC
        """

        result = client.query(query, parameters={"task_id": input_data.task_id})

        feedback_list = []
        for row in result.named_results():
            feedback_list.append({
                "responseId": row["response_id"],
                "responseIndex": row["response_index"],
                "messageCount": row["message_count"],
                "feedbackType": row["feedback_type"],
                "isPositive": row["is_positive"],
                "feedbackText": row["feedback_text"],
                "createdAt": row["created_at"],
                "traceId": row["trace_id"],
                "spanId": row["span_id"],
            })

        log.info(f"Found {len(feedback_list)} feedback records for task {input_data.task_id}")
        return feedback_list

    except Exception as e:
        log.error(f"Failed to get task feedback: {e}")
        import traceback
        log.error(traceback.format_exc())
        return []


@function.defn()
async def get_feedback_analytics(
    input_data: GetFeedbackAnalyticsInput,
) -> dict[str, Any]:
    """Get feedback analytics for a workspace.

    Returns timeseries data and summary statistics.

    Args:
        input_data: Contains workspace_id, optional agent_id, and date_range

    Returns:
        Dictionary with 'timeseries' and 'summary' keys
    """
    log.info(
        f"Querying feedback analytics for workspace {input_data.workspace_id}, "
        f"date_range={input_data.date_range}"
    )

    try:
        client = get_clickhouse_client()

        # Calculate date range
        date_mapping = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
        }
        days = date_mapping.get(input_data.date_range, 7)

        # Build WHERE clause
        where_clauses = [
            "workspace_id = {workspace_id:UUID}",
            "metric_category = 'feedback'",
            f"created_at >= now() - INTERVAL {days} DAY",
        ]

        if input_data.agent_id:
            where_clauses.append("agent_id = {agent_id:UUID}")

        where_clause = " AND ".join(where_clauses)

        # Query for timeseries data (daily aggregation)
        timeseries_query = f"""
            SELECT
                toDate(created_at) as date,
                countIf(passed = 1) as positive_count,
                countIf(passed = 0) as negative_count,
                count() as total_count,
                if(count() > 0, (countIf(passed = 0) * 100.0 / count()), 0) as negative_percentage
            FROM task_metrics
            WHERE {where_clause}
            GROUP BY date
            ORDER BY date ASC
        """

        parameters = {
            "workspace_id": input_data.workspace_id,
        }
        if input_data.agent_id:
            parameters["agent_id"] = input_data.agent_id

        result = client.query(timeseries_query, parameters=parameters)

        timeseries = []
        for row in result.named_results():
            timeseries.append({
                "date": row["date"].isoformat(),
                "positiveCount": row["positive_count"],
                "negativeCount": row["negative_count"],
                "totalCount": row["total_count"],
                "negativePercentage": round(row["negative_percentage"], 1),
            })

        # Query for summary statistics
        summary_query = f"""
            SELECT
                countIf(passed = 1) as total_positive,
                countIf(passed = 0) as total_negative,
                count() as total_feedback,
                if(count() > 0, (countIf(passed = 0) * 100.0 / count()), 0) as negative_percentage,
                if(count() > 0, (countIf(passed = 1) * 100.0 / count()), 0) as positive_percentage
            FROM task_metrics
            WHERE {where_clause}
        """

        summary_result = client.query(summary_query, parameters=parameters)
        summary_row = next(iter(summary_result.named_results()))

        summary = {
            "totalPositive": summary_row["total_positive"],
            "totalNegative": summary_row["total_negative"],
            "totalFeedback": summary_row["total_feedback"],
            "negativePercentage": round(summary_row["negative_percentage"], 1),
            "positivePercentage": round(summary_row["positive_percentage"], 1),
        }

        log.info(
            f"Found {summary['totalFeedback']} feedback records, "
            f"{summary['negativePercentage']}% negative"
        )

        return {
            "timeseries": timeseries,
            "summary": summary,
        }

    except Exception as e:
        log.error(f"Failed to get feedback analytics: {e}")
        import traceback
        log.error(traceback.format_exc())
        return {
            "timeseries": [],
            "summary": {
                "totalPositive": 0,
                "totalNegative": 0,
                "totalFeedback": 0,
                "negativePercentage": 0,
                "positivePercentage": 0,
            },
        }


@function.defn()
async def get_detailed_feedbacks(
    input_data: GetFeedbackAnalyticsInput,
) -> list[dict[str, Any]]:
    """Get detailed list of all feedbacks with task links.

    Args:
        input_data: Contains workspace_id, optional agent_id, and date_range

    Returns:
        List of detailed feedback records
    """
    log.info(
        f"Querying detailed feedbacks for workspace {input_data.workspace_id}"
    )

    try:
        client = get_clickhouse_client()

        # Calculate date range
        date_mapping = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
        }
        days = date_mapping.get(input_data.date_range, 7)

        # Build WHERE clause
        where_clauses = [
            "workspace_id = {workspace_id:UUID}",
            "metric_category = 'feedback'",
            f"created_at >= now() - INTERVAL {days} DAY",
        ]

        if input_data.agent_id:
            where_clauses.append("agent_id = {agent_id:UUID}")

        where_clause = " AND ".join(where_clauses)

        query = f"""
            SELECT
                task_id,
                agent_id,
                response_id,
                response_index,
                message_count,
                metric_type as feedback_type,
                passed as is_positive,
                reasoning as feedback_text,
                formatDateTime(created_at, '%Y-%m-%dT%H:%M:%S') as created_at_formatted,
                created_at
            FROM task_metrics
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT 1000
        """

        parameters = {
            "workspace_id": input_data.workspace_id,
        }
        if input_data.agent_id:
            parameters["agent_id"] = input_data.agent_id

        result = client.query(query, parameters=parameters)

        feedbacks = []
        for row in result.named_results():
            feedbacks.append({
                "taskId": str(row["task_id"]),
                "agentId": str(row["agent_id"]),
                "responseId": row["response_id"],
                "responseIndex": row["response_index"],
                "messageCount": row["message_count"],
                "feedbackType": row["feedback_type"],
                "isPositive": row["is_positive"],
                "feedbackText": row["feedback_text"],
                "createdAt": row["created_at_formatted"],
            })

        log.info(f"Found {len(feedbacks)} detailed feedback records")
        return feedbacks

    except Exception as e:
        log.error(f"Failed to get detailed feedbacks: {e}")
        import traceback
        log.error(traceback.format_exc())
        return []

