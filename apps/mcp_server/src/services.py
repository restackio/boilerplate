import asyncio
import logging
from pathlib import Path

from watchfiles import run_process

from src.client import client
from src.functions.generate_random_data import (
    generate_random_data,
)
from src.functions.llm_response import llm_response
from src.workflows.tools.mock_datadog_logs import MockDatadogLogs
from src.workflows.tools.mock_failing_mcp_test import (
    MockFailingMcpTest,
)
from src.workflows.tools.mock_github_pr import MockGitHubPR
from src.workflows.tools.mock_hello_world import MockHelloWorld
from src.workflows.tools.mock_knowledge_base import (
    MockKnowledgeBase,
)
from src.workflows.tools.mock_linear_issue import MockLinearIssue
from src.workflows.tools.mock_pagerduty_incident import (
    MockPagerDutyIncident,
)
from src.workflows.tools.mock_zendesk_ticket import (
    MockZendeskTicket,
)


async def run_restack_service() -> None:
    """Run the Restack service."""
    await client.start_service(
        task_queue="mcp_server",
        workflows=[
            MockZendeskTicket,
            MockDatadogLogs,
            MockLinearIssue,
            MockGitHubPR,
            MockKnowledgeBase,
            MockPagerDutyIncident,
            MockHelloWorld,
            MockFailingMcpTest,
        ],
        functions=[
            llm_response,
            generate_random_data,
        ],
    )


async def main() -> None:
    logging.info("Starting MCP server")
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
        logging.info(
            "Services interrupted by user. Exiting gracefully."
        )


def dev_watch() -> None:
    """Development mode with file watching and auto-restart."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    watch_path = Path.cwd()
    logging.info(
        "Watching %s and its subdirectories for changes...",
        watch_path,
    )
    run_process(watch_path, recursive=True, target=start)


if __name__ == "__main__":
    # Simple direct execution
    start()
