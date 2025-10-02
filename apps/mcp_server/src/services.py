import asyncio
import logging
from pathlib import Path

from watchfiles import run_process

from src.client import client
from src.functions.llm_response import llm_response
from src.functions.template_from_sample import (
    template_from_sample,
)
from src.functions.clickhouse_crud import (
    clickhouse_list_databases,
    clickhouse_list_tables,
    clickhouse_run_select_query,
)
from src.workflows.tools.generate_mock import GenerateMock
from src.workflows.tools.load_into_dataset import (
    LoadIntoDataset,
)
from src.workflows.tools.test_failures import (
    TestFailures,
)
from src.workflows.tools.transform_data import (
    TransformData,
)

from src.workflows.clickhouse_crud import (
    ClickHouseListDatabasesWorkflow,
    ClickHouseListTablesWorkflow,
    ClickHouseRunSelectQueryWorkflow,
)

# Create logger for this module
logger = logging.getLogger(__name__)


async def run_restack_service() -> None:
    """Run the Restack service."""
    await client.start_service(
        task_queue="mcp_server",
        workflows=[
            GenerateMock,
            TestFailures,
            TransformData,
            LoadIntoDataset,
            ClickHouseListDatabasesWorkflow,
            ClickHouseListTablesWorkflow,
            ClickHouseRunSelectQueryWorkflow,
        ],
        functions=[
            llm_response,
            template_from_sample,
            clickhouse_list_databases,
            clickhouse_list_tables,
            clickhouse_run_select_query,
        ],
    )


async def main() -> None:
    logger.info("Starting MCP server")
    await run_restack_service()


def start() -> None:
    """Start MCP server (production mode)."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info(
            "Services interrupted by user. Exiting gracefully."
        )


def dev_watch() -> None:
    """Development mode with file watching and auto-restart."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    watch_path = Path.cwd()
    logger.info(
        "Watching %s and its subdirectories for changes...",
        watch_path,
    )
    run_process(watch_path, recursive=True, target=start)


if __name__ == "__main__":
    # Simple direct execution
    start()
