"""Functions to query tasks by metric failures.

Performant queries against ClickHouse to filter tasks by metric results.
"""

from pydantic import BaseModel, Field
from restack_ai.function import function, log

from src.functions.data_ingestion import get_clickhouse_client


class TasksByMetricInput(BaseModel):
    """Input for querying tasks by metric failures."""

    workspace_id: str = Field(..., min_length=1)
    metric_name: str = Field(..., min_length=1)
    status: str = Field(
        default="failed", pattern="^(failed|passed)$"
    )
    agent_id: str | None = None
    version: str | None = None
    date_range: str = Field(
        default="7d", pattern="^(1d|7d|30d|90d|all)$"
    )


class TasksByFeedbackInput(BaseModel):
    """Input for querying tasks by feedback."""

    workspace_id: str = Field(..., min_length=1)
    feedback_type: str = Field(
        default="negative", pattern="^(positive|negative)$"
    )
    agent_id: str | None = None
    version: str | None = None
    date_range: str = Field(
        default="7d", pattern="^(1d|7d|30d|90d|all)$"
    )


class TaskIdsOutput(BaseModel):
    """Output for task IDs."""

    task_ids: list[str]
    count: int


def _build_date_filter(date_range: str) -> str:
    """Build date filter clause for ClickHouse query."""
    if date_range == "all":
        return ""

    days_map = {
        "1d": 1,
        "7d": 7,
        "30d": 30,
        "90d": 90,
    }
    days = days_map.get(date_range, 7)
    return f"AND created_at >= now() - INTERVAL {days} DAY"


@function.defn()
async def get_tasks_by_metric_failure(
    function_input: TasksByMetricInput,
) -> TaskIdsOutput:
    """Get task IDs that failed a specific metric.

    This function queries ClickHouse for tasks that failed a specific
    quality metric during the given time period. It's optimized for
    performance by only returning task IDs.
    """
    try:
        client = get_clickhouse_client()

        # Build WHERE clause
        where_conditions = [
            "workspace_id = {workspace_id:UUID}",
            "metric_category = 'quality'",
            "metric_name = {metric_name:String}",
        ]

        # Add status filter (failed means passed = 0, passed means passed = 1)
        if function_input.status == "failed":
            where_conditions.append("passed = 0")
        else:
            where_conditions.append("passed = 1")

        # Optional filters
        if function_input.agent_id:
            where_conditions.append(
                "agent_id = {agent_id:UUID}"
            )

        if function_input.version:
            where_conditions.append(
                "agent_version = {version:String}"
            )

        # Date filter
        date_filter = _build_date_filter(
            function_input.date_range
        )
        if date_filter:
            where_conditions.append(
                date_filter.replace("AND ", "")
            )

        where_clause = " AND ".join(where_conditions)

        # Query to get distinct task IDs
        # Note: where_clause is built from known safe strings, all user input is parameterized
        query = f"""
            SELECT DISTINCT task_id
            FROM task_metrics
            WHERE {where_clause}
            ORDER BY created_at DESC
        """  # noqa: S608

        params = {
            "workspace_id": function_input.workspace_id,
            "metric_name": function_input.metric_name,
        }

        if function_input.agent_id:
            params["agent_id"] = function_input.agent_id

        if function_input.version:
            params["version"] = function_input.version

        result = client.query(query, parameters=params)
        task_ids = [
            str(row["task_id"]) for row in result.named_results()
        ]

        log.info(
            f"Found {len(task_ids)} tasks that {function_input.status} "
            f"metric '{function_input.metric_name}' in workspace {function_input.workspace_id}"
        )

        return TaskIdsOutput(
            task_ids=task_ids, count=len(task_ids)
        )

    except Exception as e:
        log.error(f"Error querying tasks by metric failure: {e}")
        return TaskIdsOutput(task_ids=[], count=0)


@function.defn()
async def get_tasks_by_feedback(
    function_input: TasksByFeedbackInput,
) -> TaskIdsOutput:
    """Get task IDs that have specific feedback.

    This function queries ClickHouse for tasks with positive or negative
    feedback during the given time period.
    """
    try:
        client = get_clickhouse_client()

        # Build WHERE clause
        where_conditions = [
            "workspace_id = {workspace_id:UUID}",
            "metric_category = 'feedback'",
        ]

        # Add feedback type filter
        if function_input.feedback_type == "negative":
            where_conditions.append("passed = 0")
        else:
            where_conditions.append("passed = 1")

        # Optional filters
        if function_input.agent_id:
            where_conditions.append(
                "agent_id = {agent_id:UUID}"
            )

        if function_input.version:
            where_conditions.append(
                "agent_version = {version:String}"
            )

        # Date filter
        date_filter = _build_date_filter(
            function_input.date_range
        )
        if date_filter:
            where_conditions.append(
                date_filter.replace("AND ", "")
            )

        where_clause = " AND ".join(where_conditions)

        # Query to get distinct task IDs
        # Note: where_clause is built from known safe strings, all user input is parameterized
        query = f"""
            SELECT DISTINCT task_id
            FROM task_metrics
            WHERE {where_clause}
            ORDER BY created_at DESC
        """  # noqa: S608

        params = {
            "workspace_id": function_input.workspace_id,
        }

        if function_input.agent_id:
            params["agent_id"] = function_input.agent_id

        if function_input.version:
            params["version"] = function_input.version

        result = client.query(query, parameters=params)
        task_ids = [
            str(row["task_id"]) for row in result.named_results()
        ]

        log.info(
            f"Found {len(task_ids)} tasks with {function_input.feedback_type} "
            f"feedback in workspace {function_input.workspace_id}"
        )

        return TaskIdsOutput(
            task_ids=task_ids, count=len(task_ids)
        )

    except Exception as e:
        log.error(f"Error querying tasks by feedback: {e}")
        return TaskIdsOutput(task_ids=[], count=0)
