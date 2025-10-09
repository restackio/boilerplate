"""Analytics Helper Functions.

Shared utilities for querying ClickHouse analytics data.
"""

from dataclasses import dataclass
from typing import Literal

DateRange = Literal["1d", "7d", "30d", "90d"]


@dataclass
class AnalyticsFilters:
    """Type-safe filters for analytics queries."""

    workspace_id: str
    agent_id: str | None = None
    version: str | None = None
    date_range: DateRange = "7d"


def parse_date_range(date_range: DateRange) -> int:
    """Convert date range string to number of days.

    Args:
        date_range: One of "1d", "7d", "30d", "90d"

    Returns:
        Number of days (defaults to 7 if invalid)
    """
    mapping = {"1d": 1, "7d": 7, "30d": 30, "90d": 90}
    return mapping.get(date_range, 7)


def build_filter_clause(
    filters: AnalyticsFilters,
    include_version: bool = False,
    additional_filters: list[str] | None = None,
) -> tuple[str, dict]:
    """Build WHERE clause and parameters for ClickHouse queries.

    Args:
        filters: Analytics filter parameters
        include_version: Whether to include agent_version in filters
        additional_filters: Additional WHERE conditions (e.g., "status = 'completed'")

    Returns:
        Tuple of (where_clause, parameters_dict)

    Example:
        >>> filters = AnalyticsFilters(
        ...     workspace_id="abc-123", agent_id="xyz-789"
        ... )
        >>> clause, params = build_filter_clause(filters)
        >>> clause
        'workspace_id = {workspace_id:UUID} AND agent_id = {agent_id:UUID} AND executed_at >= now() - INTERVAL 7 DAY'
        >>> params
        {'workspace_id': 'abc-123', 'agent_id': 'xyz-789'}
    """
    where_clauses = ["workspace_id = {workspace_id:UUID}"]
    params = {"workspace_id": filters.workspace_id}

    # Optional agent filter
    if filters.agent_id:
        where_clauses.append("agent_id = {agent_id:UUID}")
        params["agent_id"] = filters.agent_id

    # Optional version filter (for performance metrics)
    if include_version and filters.version:
        where_clauses.append("agent_version = {version:String}")
        params["version"] = filters.version

    # Date range filter
    days = parse_date_range(filters.date_range)
    where_clauses.append(
        f"executed_at >= now() - INTERVAL {days} DAY"
    )

    # Additional custom filters
    if additional_filters:
        where_clauses.extend(additional_filters)

    return " AND ".join(where_clauses), params
