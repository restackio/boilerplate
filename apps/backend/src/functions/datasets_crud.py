"""Storage-agnostic datasets CRUD that works with PostgreSQL datasets table."""

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import text

# Import the centralized database connections
from src.database.connection import (
    get_async_db,
    get_clickhouse_async_client,
)


# Input models
class DatasetGetByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)


class DatasetGetByIdInput(BaseModel):
    dataset_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)


class DatasetCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    storage_type: str = Field(default="clickhouse")
    storage_config: dict = Field(default_factory=dict)
    tags: list[str] | None = None


class QueryDatasetEventsInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    dataset_id: str = Field(..., min_length=1)
    event_types: list[str] | None = None
    event_categories: list[str] | None = None
    tags: list[str] | None = None
    search_query: str | None = None
    limit: int = 100
    offset: int = 0


class DatasetViewInput(BaseModel):
    """Input for a dataset view."""
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=255)
    columns: list[str] = Field(default_factory=list)
    is_default: bool = Field(default=False)


class DatasetUpdateViewsInput(BaseModel):
    """Input for updating dataset views."""
    workspace_id: str = Field(..., min_length=1)
    dataset_id: str = Field(..., min_length=1)
    views: list[DatasetViewInput] = Field(default_factory=list)
    default_view_id: str | None = None


# Output models
class DatasetOutput(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: str
    storage_type: str
    storage_config: dict
    unique_event_names: int
    unique_agents: int
    last_updated_at: str | None
    created_at: str
    updated_at: str


class DatasetListOutput(BaseModel):
    datasets: list[DatasetOutput]


class DatasetSingleOutput(BaseModel):
    dataset: DatasetOutput | None = None


class QueryDatasetEventsOutput(BaseModel):
    success: bool
    events: list[dict[str, Any]]
    total_count: int
    limit: int
    offset: int
    error: str | None = None


class DatasetViewsOutput(BaseModel):
    """Output for dataset views."""
    success: bool
    views: list[dict]
    default_view_id: str | None = None
    error: str | None = None


# Database connection helpers - using centralized connections


def _build_where_conditions(
    storage_config: dict, workspace_id: str
) -> list[str]:
    """Build WHERE clause conditions based on storage config."""
    where_conditions = [f"workspace_id = '{workspace_id}'"]

    # Handle dataset_id filter if specified
    if "dataset_id" in storage_config:
        where_conditions.append(
            f"dataset_id = '{storage_config['dataset_id']}'"
        )

    # Handle tag-based filtering
    if (
        "filter" in storage_config
        and "tags" in storage_config["filter"]
    ):
        tag_conditions = [
            f"has(tags, '{tag}')"
            for tag in storage_config["filter"]["tags"]
        ]
        if tag_conditions:
            where_conditions.append(
                f"({' OR '.join(tag_conditions)})"
            )

    # Handle other filters
    if "filter" in storage_config:
        for key, value in storage_config["filter"].items():
            if (
                key != "tags" and value
            ):  # Skip tags (already handled) and empty values
                where_conditions.append(f"{key} = '{value}'")

    return where_conditions


async def _get_clickhouse_stats(
    storage_config: dict, workspace_id: str
) -> dict:
    """Get real-time statistics from ClickHouse for a dataset."""
    try:
        client = await get_clickhouse_async_client()

        where_conditions = _build_where_conditions(
            storage_config, workspace_id
        )

        # Additional filtering is handled in _build_where_conditions helper

        where_clause = " AND ".join(where_conditions)
        table_name = storage_config.get(
            "table", "pipeline_events"
        )

        # Validate table name to prevent SQL injection
        def _raise_invalid_table_name() -> None:
            msg = "Invalid table name"
            raise ValueError(msg)  # noqa: TRY301

        if not table_name.replace("_", "").isalnum():
            _raise_invalid_table_name()

        # Get stats for this dataset
        # table_name is validated above to contain only alphanumeric and underscores
        stats_query = (
            """
        SELECT
            max(ingested_at) as last_updated_at,
            uniq(event_name) as unique_event_names,
            uniq(agent_id) as unique_agents
        FROM """
            + table_name
            + """
        WHERE """
            + where_clause
            + """
        """
        )

        query_result = await client.query(stats_query)
        if query_result.result_rows:
            last_updated_at, event_names, agents = (
                query_result.result_rows[0]
            )
            return {
                "unique_event_names": event_names or 0,
                "unique_agents": agents or 0,
                "last_updated_at": last_updated_at,
            }
    except (ValueError, TypeError, ConnectionError):
        return {
            "unique_event_names": 0,
            "unique_agents": 0,
            "last_updated_at": None,
        }
    else:
        return {
            "unique_event_names": 0,
            "unique_agents": 0,
            "last_updated_at": None,
        }


@function.defn()
async def datasets_read(
    function_input: DatasetGetByWorkspaceInput,
) -> DatasetListOutput:
    """Get datasets from PostgreSQL with real-time statistics from their storage backends."""
    try:
        # Get datasets from PostgreSQL using async connection
        async for db in get_async_db():
            result = await db.execute(
                text("""
                    SELECT id, workspace_id, name, description, storage_type, storage_config,
                           last_updated_at, created_at, updated_at
                    FROM datasets
                    WHERE workspace_id = :workspace_id
                    ORDER BY created_at DESC
                """),
                {"workspace_id": function_input.workspace_id},
            )

            datasets = []
            for row in result:
                try:
                    # Get real-time stats based on storage type
                    if row.storage_type == "clickhouse":
                        stats = await _get_clickhouse_stats(
                            row.storage_config,
                            function_input.workspace_id,
                        )
                    else:
                        # Future: handle other storage types
                        stats = {
                            "unique_event_names": 0,
                            "unique_agents": 0,
                            "last_updated_at": row.last_updated_at,
                        }

                    dataset = DatasetOutput(
                        id=str(row.id),
                        workspace_id=str(row.workspace_id),
                        name=row.name,
                        description=row.description or "",
                        storage_type=row.storage_type,
                        storage_config=row.storage_config,
                        unique_event_names=stats[
                            "unique_event_names"
                        ],
                        unique_agents=stats["unique_agents"],
                        last_updated_at=stats[
                            "last_updated_at"
                        ].isoformat()
                        if stats["last_updated_at"]
                        else None,
                        created_at=row.created_at.isoformat()
                        if row.created_at
                        else datetime.now(tz=UTC).isoformat(),
                        updated_at=row.updated_at.isoformat()
                        if row.updated_at
                        else datetime.now(tz=UTC).isoformat(),
                    )
                    datasets.append(dataset)

                except (ValueError, TypeError, ConnectionError):
                    # Add dataset with stored stats if real-time query fails
                    dataset = DatasetOutput(
                        id=str(row.id),
                        workspace_id=str(row.workspace_id),
                        name=row.name,
                        description=row.description or "",
                        storage_type=row.storage_type,
                        storage_config=row.storage_config,
                        unique_event_names=0,
                        unique_agents=0,
                        last_updated_at=row.last_updated_at.isoformat()
                        if row.last_updated_at
                        else None,
                        created_at=row.created_at.isoformat()
                        if row.created_at
                        else datetime.now(tz=UTC).isoformat(),
                        updated_at=row.updated_at.isoformat()
                        if row.updated_at
                        else datetime.now(tz=UTC).isoformat(),
                    )
                    datasets.append(dataset)

            return DatasetListOutput(datasets=datasets)

    except (ValueError, TypeError, ConnectionError):
        return DatasetListOutput(datasets=[])


@function.defn()
async def datasets_get_by_id(
    function_input: DatasetGetByIdInput,
) -> DatasetSingleOutput:
    """Get dataset by ID from PostgreSQL."""
    try:
        async for db in get_async_db():
            result = await db.execute(
                text("""
                    SELECT id, workspace_id, name, description, storage_type, storage_config,
                           last_updated_at, created_at, updated_at
                    FROM datasets
                    WHERE id = :dataset_id AND workspace_id = :workspace_id
                """),
                {
                    "dataset_id": function_input.dataset_id,
                    "workspace_id": function_input.workspace_id,
                },
            )

            row = result.fetchone()
            if not row:
                return DatasetSingleOutput(dataset=None)

            try:
                # Get real-time stats based on storage type
                if row.storage_type == "clickhouse":
                    stats = await _get_clickhouse_stats(
                        row.storage_config,
                        function_input.workspace_id,
                    )
                else:
                    # Future: handle other storage types
                    stats = {
                        "unique_event_names": 0,
                        "unique_agents": 0,
                        "last_updated_at": row.last_updated_at,
                    }

                dataset = DatasetOutput(
                    id=str(row.id),
                    workspace_id=str(row.workspace_id),
                    name=row.name,
                    description=row.description or "",
                    storage_type=row.storage_type,
                    storage_config=row.storage_config,
                    unique_event_names=stats[
                        "unique_event_names"
                    ],
                    unique_agents=stats["unique_agents"],
                    last_updated_at=stats[
                        "last_updated_at"
                    ].isoformat()
                    if stats["last_updated_at"]
                    else None,
                    created_at=row.created_at.isoformat()
                    if row.created_at
                    else datetime.now(tz=UTC).isoformat(),
                    updated_at=row.updated_at.isoformat()
                    if row.updated_at
                    else datetime.now(tz=UTC).isoformat(),
                )

                return DatasetSingleOutput(dataset=dataset)

            except (ValueError, TypeError, ConnectionError):
                # Return dataset with stored stats if real-time query fails
                dataset = DatasetOutput(
                    id=str(row.id),
                    workspace_id=str(row.workspace_id),
                    name=row.name,
                    description=row.description or "",
                    storage_type=row.storage_type,
                    storage_config=row.storage_config,
                    unique_event_names=0,
                    unique_agents=0,
                    last_updated_at=row.last_updated_at.isoformat()
                    if row.last_updated_at
                    else None,
                    created_at=row.created_at.isoformat()
                    if row.created_at
                    else datetime.now(tz=UTC).isoformat(),
                    updated_at=row.updated_at.isoformat()
                    if row.updated_at
                    else datetime.now(tz=UTC).isoformat(),
                )
                return DatasetSingleOutput(dataset=dataset)

    except (ValueError, TypeError, ConnectionError):
        return DatasetSingleOutput(dataset=None)


@function.defn()
async def datasets_create(
    function_input: DatasetCreateInput,
) -> DatasetSingleOutput:
    """Create a new dataset in PostgreSQL."""
    try:
        import uuid

        # Generate UUID for the new dataset
        dataset_id = str(uuid.uuid4())

        # Set up default storage config based on storage type
        storage_config = function_input.storage_config.copy()
        if function_input.storage_type == "clickhouse":
            if not storage_config:
                storage_config = {
                    "database": "boilerplate_clickhouse",
                    "table": "pipeline_events",
                    "filter": {},
                }

            # Add tag-based filtering if tags are provided
            if function_input.tags:
                if "filter" not in storage_config:
                    storage_config["filter"] = {}
                storage_config["filter"]["tags"] = (
                    function_input.tags
                )

        # No need for schema_definition - ClickHouse schema is the source of truth

        # Insert into PostgreSQL
        import json

        async for db in get_async_db():
            await db.execute(
                text("""
                    INSERT INTO datasets (id, workspace_id, name, description, storage_type,
                                        storage_config, created_at, updated_at)
                    VALUES (:id, :workspace_id, :name, :description, :storage_type,
                            :storage_config, NOW(), NOW())
                """),
                {
                    "id": dataset_id,
                    "workspace_id": function_input.workspace_id,
                    "name": function_input.name,
                    "description": function_input.description,
                    "storage_type": function_input.storage_type,
                    "storage_config": json.dumps(storage_config),
                },
            )
            await db.commit()

        # Return the created dataset
        return await datasets_get_by_id(
            DatasetGetByIdInput(
                dataset_id=dataset_id,
                workspace_id=function_input.workspace_id,
            )
        )

    except (ValueError, TypeError, ConnectionError) as e:
        msg = f"Failed to create dataset '{function_input.name}': {e!s}"
        raise NonRetryableError(msg) from e


@function.defn()
async def datasets_update_views(
    function_input: DatasetUpdateViewsInput,
) -> DatasetViewsOutput:
    """Update dataset views in storage_config."""
    try:
        import json
        
        # Get the current dataset
        dataset_result = await datasets_get_by_id(
            DatasetGetByIdInput(
                dataset_id=function_input.dataset_id,
                workspace_id=function_input.workspace_id,
            )
        )
        
        if not dataset_result.dataset:
            return DatasetViewsOutput(
                success=False,
                views=[],
                error=f"Dataset {function_input.dataset_id} not found",
            )
        
        dataset = dataset_result.dataset
        storage_config = dataset.storage_config.copy()
        
        # Update views in storage_config
        views_data = [
            {
                "id": view.id,
                "name": view.name,
                "columns": view.columns,
                "is_default": view.is_default,
            }
            for view in function_input.views
        ]
        
        storage_config["views"] = views_data
        
        # Set default view ID if provided
        if function_input.default_view_id:
            storage_config["default_view_id"] = function_input.default_view_id
        elif views_data and any(v.get("is_default") for v in views_data):
            # Find the default view ID
            default_view = next(
                (v for v in views_data if v.get("is_default")), None
            )
            if default_view:
                storage_config["default_view_id"] = default_view["id"]
        
        # Update the dataset in PostgreSQL
        async for db in get_async_db():
            await db.execute(
                text("""
                    UPDATE datasets
                    SET storage_config = :storage_config,
                        updated_at = NOW()
                    WHERE id = :dataset_id AND workspace_id = :workspace_id
                """),
                {
                    "dataset_id": function_input.dataset_id,
                    "workspace_id": function_input.workspace_id,
                    "storage_config": json.dumps(storage_config),
                },
            )
            await db.commit()
        
        return DatasetViewsOutput(
            success=True,
            views=views_data,
            default_view_id=storage_config.get("default_view_id"),
        )
        
    except (ValueError, TypeError, ConnectionError) as e:
        return DatasetViewsOutput(
            success=False,
            views=[],
            error=str(e),
        )


@function.defn()
async def query_dataset_events(
    function_input: QueryDatasetEventsInput,
) -> QueryDatasetEventsOutput:
    """Query events from a dataset based on its storage configuration."""
    try:
        # First get the dataset to understand its storage configuration
        dataset_result = await datasets_get_by_id(
            DatasetGetByIdInput(
                dataset_id=function_input.dataset_id,
                workspace_id=function_input.workspace_id,
            )
        )

        if not dataset_result.dataset:
            return QueryDatasetEventsOutput(
                success=False,
                error=f"Dataset {function_input.dataset_id} not found",
                events=[],
                total_count=0,
                limit=function_input.limit,
                offset=function_input.offset,
            )

        dataset = dataset_result.dataset

        # Handle different storage types
        if dataset.storage_type == "clickhouse":
            return await _query_clickhouse_events(
                dataset, function_input
            )
        # Future: handle other storage types
        return QueryDatasetEventsOutput(
            success=False,
            error=f"Storage type {dataset.storage_type} not yet supported",
            events=[],
            total_count=0,
            limit=function_input.limit,
            offset=function_input.offset,
        )

    except (ValueError, TypeError, ConnectionError) as e:
        return QueryDatasetEventsOutput(
            success=False,
            error=str(e),
            events=[],
            total_count=0,
            limit=function_input.limit,
            offset=function_input.offset,
        )


def _build_dataset_filters(
    storage_config: dict, workspace_id: str
) -> list[str]:
    """Build WHERE conditions from dataset storage config."""
    conditions = [f"workspace_id = '{workspace_id}'"]

    if "dataset_id" in storage_config:
        conditions.append(
            f"dataset_id = '{storage_config['dataset_id']}'"
        )

    return conditions


def _build_tag_filters(storage_config: dict) -> list[str]:
    """Build tag-based WHERE conditions from storage config."""
    if (
        "filter" not in storage_config
        or "tags" not in storage_config["filter"]
    ):
        return []

    tag_conditions = [
        f"has(tags, '{tag}')"
        for tag in storage_config["filter"]["tags"]
    ]
    if tag_conditions:
        return [f"({' OR '.join(tag_conditions)})"]
    return []


def _build_other_storage_filters(
    storage_config: dict,
) -> list[str]:
    """Build non-tag WHERE conditions from storage config."""
    if "filter" not in storage_config:
        return []

    conditions = []
    for key, value in storage_config["filter"].items():
        if key == "tags":  # Skip tags, handled separately
            continue
        if isinstance(value, str):
            conditions.append(f"{key} = '{value}'")
        else:
            conditions.append(f"{key} = {value}")
    return conditions


def _build_user_filters(
    function_input: QueryDatasetEventsInput,
) -> list[str]:
    """Build WHERE conditions from user-provided filters."""
    conditions = []

    if function_input.tags:
        user_tag_conditions = [
            f"has(tags, '{tag}')" for tag in function_input.tags
        ]
        conditions.append(f"({' OR '.join(user_tag_conditions)})")

    if function_input.search_query:
        conditions.append(
            f"(event_name ILIKE '%{function_input.search_query}%' OR "
            f"JSONExtractString(raw_data, 'content') ILIKE '%{function_input.search_query}%')"
        )

    return conditions


def _validate_table_name(table_name: str) -> None:
    """Validate table name to prevent SQL injection."""
    if not table_name.replace("_", "").isalnum():
        msg = "Invalid table name"
        raise ValueError(msg)


async def _query_clickhouse_events(
    dataset: DatasetOutput,
    function_input: QueryDatasetEventsInput,
) -> QueryDatasetEventsOutput:
    """Query events from ClickHouse based on dataset configuration."""
    try:
        client = await get_clickhouse_async_client()
        storage_config = dataset.storage_config

        # Build WHERE conditions from various sources
        where_conditions = []
        where_conditions.extend(
            _build_dataset_filters(
                storage_config, function_input.workspace_id
            )
        )
        where_conditions.extend(
            _build_tag_filters(storage_config)
        )
        where_conditions.extend(
            _build_other_storage_filters(storage_config)
        )
        where_conditions.extend(
            _build_user_filters(function_input)
        )

        where_clause = " AND ".join(where_conditions)
        table_name = storage_config.get(
            "table", "pipeline_events"
        )

        # Validate table name to prevent SQL injection
        _validate_table_name(table_name)

        # Query for events
        # table_name is validated above to contain only alphanumeric and underscores
        events_query = (
            """
        SELECT
            id,
            agent_id,
            task_id,
            event_name,
            raw_data,
            transformed_data,
            tags,
            event_timestamp
        FROM """
            + table_name
            + """
        WHERE """
            + where_clause
            + """
        ORDER BY event_timestamp DESC
        LIMIT """
            + str(function_input.limit)
            + """ OFFSET """
            + str(function_input.offset)
            + """
        """
        )

        # Count total - table name already validated above
        count_query = f"SELECT count() FROM {table_name} WHERE {where_clause}"  # noqa: S608

        events_result = await client.query(events_query)
        count_result = await client.query(count_query)

        total_count = (
            count_result.result_rows[0][0]
            if count_result.result_rows
            else 0
        )

        events = [
            {
                "id": row[0],
                "agent_id": row[1],
                "task_id": row[2],
                "event_name": row[3],
                "raw_data": row[4],
                "transformed_data": row[5],
                "tags": row[6],
                "event_timestamp": row[7].isoformat()
                if row[7]
                else None,
            }
            for row in events_result.result_rows
        ]

        return QueryDatasetEventsOutput(
            success=True,
            events=events,
            total_count=total_count,
            limit=function_input.limit,
            offset=function_input.offset,
        )

    except (ValueError, TypeError, ConnectionError) as e:
        return QueryDatasetEventsOutput(
            success=False,
            error=str(e),
            events=[],
            total_count=0,
            limit=function_input.limit,
            offset=function_input.offset,
        )
