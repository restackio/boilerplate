"""CockroachDB CRUD workflows."""

from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.cockroachdb_crud import (
        CockroachDBListDatabasesInput,
        CockroachDBListDatabasesOutput,
        CockroachDBListTablesInput,
        CockroachDBListTablesOutput,
        CockroachDBRunSelectQueryInput,
        CockroachDBRunSelectQueryOutput,
        cockroachdb_list_databases,
        cockroachdb_list_tables,
        cockroachdb_run_select_query,
    )


@workflow.defn(
    mcp=True,
    description="""Run a read-only SELECT query against CockroachDB.

The pipeline_events table stores event data with JSONB columns. Access fields using PostgreSQL JSON operators:
- Use raw_data->>'field_name' for text values
- Use (raw_data->>'field_name')::numeric for numeric values
- Use raw_data->'nested'->'key' for nested objects

To filter by tags use: 'your_tag' = ANY(tags)

Example query:
SELECT
    event_name,
    raw_data->>'author' AS author,
    (raw_data->>'likes')::int AS likes,
    event_timestamp,
    tags
FROM pipeline_events
WHERE 'YOUR_TAG' = ANY(tags)
ORDER BY event_timestamp DESC
LIMIT 50;
""",
)
class CockroachDBRunSelectQuery:
    """Workflow to run a SELECT query in CockroachDB."""

    @workflow.run
    async def run(
        self, workflow_input: CockroachDBRunSelectQueryInput
    ) -> CockroachDBRunSelectQueryOutput:
        log.info(
            f"CockroachDBRunSelectQuery started with query: {workflow_input.query}"
        )
        try:
            return await workflow.step(
                task_queue="mcp_server",
                function=cockroachdb_run_select_query,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=60),
            )
        except Exception as e:
            error_message = (
                f"Error during cockroachdb_run_select_query: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn(mcp=True)
class CockroachDBListDatabases:
    """Workflow to list CockroachDB databases."""

    @workflow.run
    async def run(
        self,
        workflow_input: CockroachDBListDatabasesInput
        | None = None,
    ) -> CockroachDBListDatabasesOutput:
        log.info("CockroachDBListDatabases started")
        try:
            if workflow_input is None:
                workflow_input = CockroachDBListDatabasesInput()

            return await workflow.step(
                task_queue="mcp_server",
                function=cockroachdb_list_databases,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = (
                f"Error during cockroachdb_list_databases: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn(mcp=True)
class CockroachDBListTables:
    """Workflow to list tables in a CockroachDB database."""

    @workflow.run
    async def run(
        self, workflow_input: CockroachDBListTablesInput
    ) -> CockroachDBListTablesOutput:
        log.info(
            f"CockroachDBListTables started for database: {workflow_input.database}"
        )
        try:
            return await workflow.step(
                task_queue="mcp_server",
                function=cockroachdb_list_tables,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = (
                f"Error during cockroachdb_list_tables: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
