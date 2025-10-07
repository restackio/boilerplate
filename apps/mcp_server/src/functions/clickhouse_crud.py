"""ClickHouse CRUD functions for querying and managing ClickHouse databases."""

import os
from typing import Any

import clickhouse_connect
from clickhouse_connect.driver.binding import format_query_value
from clickhouse_connect.driver.client import Client
from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function


class ClickHouseRunSelectQueryInput(BaseModel):
    """Input for running a SELECT query in ClickHouse."""

    query: str = Field(
        ..., description="The SELECT query to execute"
    )


class ClickHouseRunSelectQueryOutput(BaseModel):
    """Output from running a SELECT query."""

    columns: list[str] = Field(
        default_factory=list, description="Column names"
    )
    rows: list[list[Any]] = Field(
        default_factory=list, description="Result rows"
    )


class ClickHouseListDatabasesInput(BaseModel):
    """Input for listing ClickHouse databases."""

    # No input needed


class ClickHouseListDatabasesOutput(BaseModel):
    """Output from listing databases."""

    databases: list[str] = Field(
        default_factory=list, description="List of database names"
    )


class ClickHouseListTablesInput(BaseModel):
    """Input for listing tables in a ClickHouse database."""

    database: str = Field(
        ..., description="Database name to list tables from"
    )
    like: str | None = Field(
        None, description="Filter tables with LIKE pattern"
    )
    not_like: str | None = Field(
        None, description="Exclude tables with NOT LIKE pattern"
    )


class ClickHouseListTablesOutput(BaseModel):
    """Output from listing tables."""

    tables: list[dict[str, Any]] = Field(
        default_factory=list,
        description="List of tables with metadata",
    )


def _create_clickhouse_client() -> Client:
    """Create a ClickHouse client connection."""
    try:
        return clickhouse_connect.get_client(
            host=os.getenv("CLICKHOUSE_HOST", "localhost"),
            port=int(os.getenv("CLICKHOUSE_PORT", "8123")),
            username=os.getenv("CLICKHOUSE_USER", "clickhouse"),
            password=os.getenv(
                "CLICKHOUSE_PASSWORD", "clickhouse"
            ),
            database=os.getenv(
                "CLICKHOUSE_DATABASE", "boilerplate_clickhouse"
            ),
        )
    except Exception as e:
        msg = f"Failed to connect to ClickHouse: {e!s}"
        raise ConnectionError(msg) from e


@function.defn()
async def clickhouse_run_select_query(
    function_input: ClickHouseRunSelectQueryInput,
) -> ClickHouseRunSelectQueryOutput:
    """Run a SELECT query in a ClickHouse database."""
    try:
        client = _create_clickhouse_client()

        # Execute the query with read-only mode
        result = client.query(
            function_input.query, settings={"readonly": "1"}
        )

        return ClickHouseRunSelectQueryOutput(
            columns=result.column_names,
            rows=result.result_rows,
        )
    except Exception as e:
        raise NonRetryableError(
            message=f"Query execution failed: {e!s}"
        ) from e


@function.defn()
async def clickhouse_list_databases(
    function_input: ClickHouseListDatabasesInput,  # noqa: ARG001
) -> ClickHouseListDatabasesOutput:
    """List available ClickHouse databases."""
    try:
        client = _create_clickhouse_client()
        result = client.command("SHOW DATABASES")

        # Convert newline-separated string to list
        if isinstance(result, str):
            databases = [
                db.strip() for db in result.strip().split("\n")
            ]
        else:
            databases = [result]

        return ClickHouseListDatabasesOutput(
            databases=databases,
        )
    except Exception as e:
        raise NonRetryableError(
            message=f"Failed to list databases: {e!s}"
        ) from e


@function.defn()
async def clickhouse_list_tables(
    function_input: ClickHouseListTablesInput,
) -> ClickHouseListTablesOutput:
    """List available ClickHouse tables in a database with metadata."""
    try:
        client = _create_clickhouse_client()

        # Build query with optional filters
        # Note: format_query_value properly escapes SQL values
        query = (
            f"SELECT database, name, engine, total_rows, total_bytes, "  # noqa: S608
            f"total_bytes_uncompressed, parts, active_parts, comment "
            f"FROM system.tables WHERE database = {format_query_value(function_input.database)}"
        )

        if function_input.like:
            query += f" AND name LIKE {format_query_value(function_input.like)}"

        if function_input.not_like:
            query += f" AND name NOT LIKE {format_query_value(function_input.not_like)}"

        result = client.query(query)

        # Convert to list of dicts
        tables = []
        for row in result.result_rows:
            table_dict = dict(
                zip(result.column_names, row, strict=False)
            )
            tables.append(table_dict)

        return ClickHouseListTablesOutput(
            tables=tables,
        )
    except Exception as e:
        raise NonRetryableError(
            message=f"Failed to list tables: {e!s}"
        ) from e
