"""CockroachDB CRUD functions for querying and exploring CockroachDB databases."""

import os
from typing import Any

import asyncpg
from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function


class CockroachDBRunSelectQueryInput(BaseModel):
    """Input for running a read-only SELECT query in CockroachDB."""

    query: str = Field(..., description="The SELECT query to execute")


class CockroachDBRunSelectQueryOutput(BaseModel):
    """Output from running a SELECT query."""

    columns: list[str] = Field(
        default_factory=list, description="Column names"
    )
    rows: list[list[Any]] = Field(
        default_factory=list, description="Result rows"
    )


class CockroachDBListDatabasesInput(BaseModel):
    """Input for listing CockroachDB databases."""


class CockroachDBListDatabasesOutput(BaseModel):
    """Output from listing databases."""

    databases: list[str] = Field(
        default_factory=list, description="List of database names"
    )


class CockroachDBListTablesInput(BaseModel):
    """Input for listing tables in a CockroachDB database."""

    database: str = Field(
        ..., description="Database name to list tables from"
    )
    like: str | None = Field(
        None, description="Filter tables with LIKE pattern (matches table name)"
    )


class CockroachDBListTablesOutput(BaseModel):
    """Output from listing tables."""

    tables: list[dict[str, Any]] = Field(
        default_factory=list,
        description="List of tables with metadata",
    )


async def _create_cockroachdb_pool() -> asyncpg.Pool:
    """Create a CockroachDB asyncpg connection pool.

    Requires COCKROACHDB_URL environment variable in format:
    - postgresql://root@host:port/database?sslmode=disable  (insecure / local)
    - postgresql://user:password@host:port/database          (with TLS)
    """
    try:
        cockroachdb_url = os.getenv(
            "COCKROACHDB_URL",
            "postgresql://root@localhost:26257/boilerplate_cockroachdb?sslmode=disable",
        )
        return await asyncpg.create_pool(
            dsn=cockroachdb_url,
            min_size=1,
            max_size=5,
            command_timeout=30,
        )
    except Exception as e:
        msg = f"Failed to connect to CockroachDB: {e!s}"
        raise ConnectionError(msg) from e


_mcp_cockroachdb_pool: asyncpg.Pool | None = None


async def _get_mcp_cockroachdb_pool() -> asyncpg.Pool:
    """Return shared MCP CockroachDB pool, creating on first call."""
    global _mcp_cockroachdb_pool  # noqa: PLW0603
    if _mcp_cockroachdb_pool is None or _mcp_cockroachdb_pool._closed:  # noqa: SLF001
        _mcp_cockroachdb_pool = await _create_cockroachdb_pool()
    return _mcp_cockroachdb_pool


@function.defn()
async def cockroachdb_run_select_query(
    function_input: CockroachDBRunSelectQueryInput,
) -> CockroachDBRunSelectQueryOutput:
    """Run a read-only SELECT query against CockroachDB."""
    try:
        pool = await _get_mcp_cockroachdb_pool()

        async with pool.acquire() as conn:
            # Enforce read-only for safety
            await conn.execute("SET default_transaction_read_only = true")
            rows = await conn.fetch(function_input.query)

        if not rows:
            return CockroachDBRunSelectQueryOutput(columns=[], rows=[])

        columns = list(rows[0].keys())
        result_rows = [list(row.values()) for row in rows]

        return CockroachDBRunSelectQueryOutput(
            columns=columns,
            rows=result_rows,
        )
    except Exception as e:
        raise NonRetryableError(
            message=f"Query execution failed: {e!s}"
        ) from e


@function.defn()
async def cockroachdb_list_databases(
    function_input: CockroachDBListDatabasesInput,  # noqa: ARG001
) -> CockroachDBListDatabasesOutput:
    """List all available CockroachDB databases."""
    try:
        pool = await _get_mcp_cockroachdb_pool()

        async with pool.acquire() as conn:
            rows = await conn.fetch("SHOW DATABASES")

        databases = [row["database_name"] for row in rows]

        return CockroachDBListDatabasesOutput(databases=databases)
    except Exception as e:
        raise NonRetryableError(
            message=f"Failed to list databases: {e!s}"
        ) from e


@function.defn()
async def cockroachdb_list_tables(
    function_input: CockroachDBListTablesInput,
) -> CockroachDBListTablesOutput:
    """List tables in a CockroachDB database with basic metadata."""
    try:
        pool = await _get_mcp_cockroachdb_pool()

        query = (
            "SELECT table_name, table_type "
            "FROM information_schema.tables "
            "WHERE table_schema = 'public' "
            "AND table_catalog = $1"
        )
        params: list[Any] = [function_input.database]

        if function_input.like:
            query += " AND table_name LIKE $2"
            params.append(function_input.like)

        query += " ORDER BY table_name"

        async with pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

        tables = [dict(row) for row in rows]

        return CockroachDBListTablesOutput(tables=tables)
    except Exception as e:
        raise NonRetryableError(
            message=f"Failed to list tables: {e!s}"
        ) from e
