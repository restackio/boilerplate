"""Universal data ingestion functions for ClickHouse pipeline events."""

import logging
import os
import uuid
from datetime import UTC, datetime
from typing import Any

import clickhouse_connect
from pydantic import BaseModel, Field
from restack_ai.function import function

logger = logging.getLogger(__name__)


class PipelineEventInput(BaseModel):
    # Required pipeline tracking
    agent_id: str = Field(..., min_length=1)
    task_id: str | None = (
        None  # Task ID from PostgreSQL (if event is task-related)
    )
    workspace_id: str = Field(..., min_length=1)
    dataset_id: str | None = None

    # Event identification
    event_name: str = Field(
        ..., min_length=1
    )  # Human readable event name

    # Dynamic event data - this is where ALL the flexibility lives!
    raw_data: dict[str, Any] = Field(
        default_factory=dict
    )  # Original event data - JSON object with ANY structure
    transformed_data: dict[str, Any] | None = (
        None  # Optional processed/transformed version
    )

    # Flexible tagging system for classification and search
    tags: list[str] | None = (
        None  # Searchable tags/keywords/labels for any classification needs
    )

    # Optional vector embedding for semantic search
    embedding: list[float] | None = None

    # Timestamps
    event_timestamp: str | None = (
        None  # When the original event occurred
    )


class DataIngestionOutput(BaseModel):
    success: bool
    inserted_rows: int
    table_name: str = "pipeline_events"
    execution_time_ms: int = 0
    error: str | None = None


def get_clickhouse_client() -> clickhouse_connect.driver.Client:
    """Get ClickHouse client connection."""
    return clickhouse_connect.get_client(
        host=os.getenv("CLICKHOUSE_HOST", "localhost"),
        port=int(os.getenv("CLICKHOUSE_PORT", "8123")),
        username=os.getenv("CLICKHOUSE_USER", "clickhouse"),
        password=os.getenv("CLICKHOUSE_PASSWORD", "clickhouse"),
        database=os.getenv(
            "CLICKHOUSE_DATABASE", "boilerplate_clickhouse"
        ),
    )


def _process_event_timestamp(
    event_timestamp: str | None,
) -> datetime:
    """Process and validate event timestamp."""
    if event_timestamp:
        return datetime.fromisoformat(
            event_timestamp.replace("Z", "+00:00")
        )
    return datetime.now(tz=UTC)


def _process_event_uuids(
    event: PipelineEventInput, event_index: int
) -> tuple[str, str | None, str]:
    """Process and validate UUIDs for an event."""
    try:
        logger.debug("Processing UUIDs for event %d", event_index)
        logger.debug(
            "agent_id: %s (type: %s)",
            event.agent_id,
            type(event.agent_id),
        )
        logger.debug(
            "task_id: %s (type: %s)",
            event.task_id,
            type(event.task_id),
        )
        logger.debug(
            "workspace_id: %s (type: %s)",
            event.workspace_id,
            type(event.workspace_id),
        )

        # Simple UUID conversion - assuming all UUIDs are properly formatted at source
        agent_uuid = (
            str(uuid.UUID(event.agent_id))
            if event.agent_id
            else None
        )
        task_uuid = (
            str(uuid.UUID(event.task_id))
            if event.task_id
            else None
        )
        workspace_uuid = (
            str(uuid.UUID(event.workspace_id))
            if event.workspace_id
            else None
        )

        logger.debug(
            "Converted UUIDs - agent: %s, task: %s, workspace: %s",
            agent_uuid,
            task_uuid,
            workspace_uuid,
        )
    except ValueError as ve:
        msg = f"Invalid UUID format in agent_id='{event.agent_id}', task_id='{event.task_id}', workspace_id='{event.workspace_id}': {ve}"
        logger.exception("UUID conversion error: %s", msg)
        raise Exception(msg) from ve
    except (TypeError, ConnectionError) as e:
        msg = f"Unexpected error processing UUIDs for event {event_index}: {type(e).__name__}: {e}"
        logger.exception("Unexpected UUID error: %s", msg)
        raise Exception(msg) from e
    else:
        return agent_uuid, task_uuid, workspace_uuid


def _create_event_row(
    event: PipelineEventInput,
    agent_uuid: str,
    task_uuid: str | None,
    workspace_uuid: str,
    event_ts: datetime,
) -> dict:
    """Create a data row for ClickHouse insertion."""
    return {
        "id": str(uuid.uuid4()),
        "agent_id": agent_uuid,
        "task_id": task_uuid,
        "workspace_id": workspace_uuid,
        "dataset_id": event.dataset_id,
        "event_name": event.event_name,
        "raw_data": event.raw_data,
        "transformed_data": event.transformed_data,
        "tags": event.tags or [],
        "embedding": event.embedding or [],
        "event_timestamp": event_ts,
        "ingested_at": datetime.now(tz=UTC),
    }


def _insert_data_to_clickhouse(
    client: clickhouse_connect.driver.Client,
    data_rows: list[dict],
) -> None:
    """Insert data rows to ClickHouse with proper error handling."""
    try:
        column_names = [
            "id",
            "agent_id",
            "task_id",
            "workspace_id",
            "dataset_id",
            "event_name",
            "raw_data",
            "transformed_data",
            "tags",
            "embedding",
            "event_timestamp",
            "ingested_at",
        ]

        # Convert dictionary rows to list of lists format expected by ClickHouse
        formatted_rows = []
        for row in data_rows:
            formatted_row = [row[col] for col in column_names]
            formatted_rows.append(formatted_row)

        client.insert(
            "pipeline_events",
            formatted_rows,
            column_names=column_names,
        )
        logger.info(
            "Successfully inserted %d rows", len(formatted_rows)
        )
    except Exception as insert_error:
        logger.exception("ClickHouse insert failed")
        logger.debug(
            "Insert error args: %s",
            getattr(insert_error, "args", "No args"),
        )
        raise


@function.defn()
async def ingest_pipeline_events(
    events: list[PipelineEventInput],
) -> DataIngestionOutput:
    """Ingest ANY type of event from pipeline agents with vector embeddings for semantic search."""
    try:
        logger.debug(
            "ingest_pipeline_events called with %d events",
            len(events),
        )
        logger.debug(
            "First event type: %s",
            type(events[0]) if events else "No events",
        )

        client = get_clickhouse_client()
        start_time = datetime.now(tz=UTC)

        data_rows = []
        for i, event in enumerate(events):
            logger.debug(
                "Processing event %d: %s", i, type(event)
            )
            logger.debug("Event data: %s", event)

            event_ts = _process_event_timestamp(
                event.event_timestamp
            )
            agent_uuid, task_uuid, workspace_uuid = (
                _process_event_uuids(event, i)
            )
            row = _create_event_row(
                event,
                agent_uuid,
                task_uuid,
                workspace_uuid,
                event_ts,
            )
            logger.debug("Created row %d: %s", i, row)
            data_rows.append(row)

        logger.debug(
            "About to insert %d rows into ClickHouse",
            len(data_rows),
        )
        logger.debug(
            "Sample row structure: %s",
            data_rows[0] if data_rows else "No rows",
        )

        _insert_data_to_clickhouse(client, data_rows)

        execution_time = int(
            (datetime.now(tz=UTC) - start_time).total_seconds()
            * 1000
        )

        return DataIngestionOutput(
            success=True,
            inserted_rows=len(data_rows),
            table_name="pipeline_events",
            execution_time_ms=execution_time,
        )

    except (ValueError, TypeError, ConnectionError) as e:
        # Get more detailed error information
        logger.exception("Exception in ingest_pipeline_events")
        logger.debug(
            "Exception args: %s", getattr(e, "args", "No args")
        )

        error_msg = f"{type(e).__name__}: {e!s}"
        if hasattr(e, "code"):
            error_msg += f" (Code: {e.code})"
        if hasattr(e, "args") and e.args:
            error_msg += f" (Args: {e.args})"

        return DataIngestionOutput(
            success=False,
            inserted_rows=0,
            table_name="pipeline_events",
            execution_time_ms=0,
            error=error_msg,
        )


@function.defn()
async def query_clickhouse_data(query: str) -> dict[str, Any]:
    """Execute a query against ClickHouse and return results."""
    try:
        client = get_clickhouse_client()
        start_time = datetime.now(tz=UTC)

        # Execute query
        result = client.query(query)

        execution_time = int(
            (datetime.now(tz=UTC) - start_time).total_seconds()
            * 1000
        )
    except (ValueError, TypeError, ConnectionError) as e:
        return {
            "success": False,
            "error": str(e),
            "rows": [],
            "columns": [],
            "execution_time_ms": 0,
        }
    else:
        return {
            "success": True,
            "rows": result.result_rows,
            "columns": result.column_names,
            "execution_time_ms": execution_time,
        }
