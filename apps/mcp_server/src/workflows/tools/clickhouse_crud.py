"""ClickHouse CRUD workflows."""

from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.clickhouse_crud import (
        ClickHouseListDatabasesInput,
        ClickHouseListDatabasesOutput,
        ClickHouseListTablesInput,
        ClickHouseListTablesOutput,
        ClickHouseRunSelectQueryInput,
        ClickHouseRunSelectQueryOutput,
        clickhouse_list_databases,
        clickhouse_list_tables,
        clickhouse_run_select_query,
    )


@workflow.defn()
class ClickHouseRunSelectQuery:
    """Workflow to run a SELECT query in ClickHouse."""

    @workflow.run
    async def run(
        self, workflow_input: ClickHouseRunSelectQueryInput
    ) -> ClickHouseRunSelectQueryOutput:
        log.info(f"ClickHouseRunSelectQuery started with query: {workflow_input.query}")
        try:
            return await workflow.step(
                task_queue="mcp_server",
                function=clickhouse_run_select_query,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=60),
            )
        except Exception as e:
            error_message = f"Error during clickhouse_run_select_query: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ClickHouseListDatabases:
    """Workflow to list ClickHouse databases."""

    @workflow.run
    async def run(
        self, workflow_input: ClickHouseListDatabasesInput
    ) -> ClickHouseListDatabasesOutput:
        log.info("ClickHouseListDatabases started")
        try:
            return await workflow.step(
                task_queue="mcp_server",
                function=clickhouse_list_databases,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during clickhouse_list_databases: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ClickHouseListTables:
    """Workflow to list tables in a ClickHouse database."""

    @workflow.run
    async def run(
        self, workflow_input: ClickHouseListTablesInput
    ) -> ClickHouseListTablesOutput:
        log.info(f"ClickHouseListTables started for database: {workflow_input.database}")
        try:
            return await workflow.step(
                task_queue="mcp_server",
                function=clickhouse_list_tables,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during clickhouse_list_tables: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e

