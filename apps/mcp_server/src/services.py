import asyncio
import logging
from pathlib import Path

from watchfiles import run_process

from src.client import client
from src.functions.clickhouse_crud import (
    clickhouse_list_databases,
    clickhouse_list_tables,
    clickhouse_run_select_query,
)
from src.functions.cockroachdb_crud import (
    cockroachdb_list_databases,
    cockroachdb_list_tables,
    cockroachdb_run_select_query,
)
from src.functions.llm_response import llm_response
from src.functions.template_from_sample import (
    template_from_sample,
)
from src.functions.update_todos import update_todos
from src.workflows.tools.clickhouse_crud import (
    ClickHouseListDatabases,
    ClickHouseListTables,
    ClickHouseRunSelectQuery,
)
from src.workflows.tools.cockroachdb_crud import (
    CockroachDBListDatabases,
    CockroachDBListTables,
    CockroachDBRunSelectQuery,
)
from src.workflows.tools.complete_task import CompleteTask
from src.workflows.tools.create_subtask import CreateSubtask
from src.workflows.tools.generate_mock import GenerateMock
from src.workflows.tools.list_integration_tools import (
    ListIntegrationTools,
)
from src.workflows.tools.list_workspace_integrations import (
    ListWorkspaceIntegrations,
)
from src.workflows.tools.load_into_dataset import (
    LoadIntoDataset,
)
from src.workflows.tools.mock_ai_integration import (
    MockAIIntegration,
)
from src.workflows.tools.search_remote_mcp_directory import (
    SearchRemoteMcpDirectory,
)
from src.workflows.tools.slack_bind_channel import (
    SlackBindChannel,
)
from src.workflows.tools.slack_check_connection import (
    SlackCheckConnection,
)
from src.workflows.tools.slack_list_channels import (
    SlackListChannels,
)
from src.workflows.tools.test_failures import (
    TestFailures,
)
from src.workflows.tools.transform_data import (
    TransformData,
)
from src.workflows.tools.update_agent import UpdateAgent
from src.workflows.tools.update_agent_tool import UpdateAgentTool
from src.workflows.tools.update_dataset import UpdateDataset
from src.workflows.tools.update_file import UpdateFile
from src.workflows.tools.update_integration import (
    UpdateIntegration,
)
from src.workflows.tools.update_pattern_specs import (
    UpdatePatternSpecs,
)
from src.workflows.tools.update_todos import UpdateTodos
from src.workflows.tools.update_view import UpdateView

# Create logger for this module
logger = logging.getLogger(__name__)


async def run_restack_service() -> None:
    """Run the Restack service."""
    await client.start_service(
        task_queue="mcp_server",
        workflows=[
            UpdateAgentTool,
            UpdateAgent,
            UpdateDataset,
            UpdateIntegration,
            UpdateFile,
            UpdateView,
            UpdatePatternSpecs,
            ListIntegrationTools,
            ListWorkspaceIntegrations,
            SearchRemoteMcpDirectory,
            GenerateMock,
            MockAIIntegration,
            TestFailures,
            TransformData,
            LoadIntoDataset,
            ClickHouseListDatabases,
            ClickHouseListTables,
            ClickHouseRunSelectQuery,
            CockroachDBListDatabases,
            CockroachDBListTables,
            CockroachDBRunSelectQuery,
            CreateSubtask,
            UpdateTodos,
            CompleteTask,
            SlackCheckConnection,
            SlackListChannels,
            SlackBindChannel,
        ],
        functions=[
            llm_response,
            template_from_sample,
            clickhouse_list_databases,
            clickhouse_list_tables,
            clickhouse_run_select_query,
            cockroachdb_list_databases,
            cockroachdb_list_tables,
            cockroachdb_run_select_query,
            update_todos,
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
