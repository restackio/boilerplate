import asyncio
import logging
import webbrowser
from pathlib import Path

from watchfiles import run_process

from src.client import client

from src.functions.llm_response import llm_response

from src.workflows.tools.datadog_logs import DatadogLogs
from src.workflows.tools.github_pr import GitHubPR
from src.workflows.tools.knowledge_base import KnowledgeBase
from src.workflows.tools.linear_issue import LinearIssue
from src.workflows.tools.pagerduty_incident import (
    PagerDutyIncident,
)
from src.workflows.tools.zendesk_ticket import ZendeskTicket


async def run_restack_service() -> None:
    """Run the Restack service."""
    await client.start_service(
        task_queue="mcp_server",
        workflows=[
            ZendeskTicket,
            DatadogLogs,
            LinearIssue,
            GitHubPR,
            KnowledgeBase,
            PagerDutyIncident,
        ],
        functions=[
            llm_response,
        ],
    )


async def main() -> None:
    logging.info("Starting MCP server")
    await run_restack_service()


def start() -> None:
    """Start MCP server (production mode)."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Services interrupted by user. Exiting gracefully.")


def dev_watch() -> None:
    """Development mode with file watching and auto-restart."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    watch_path = Path.cwd()
    logging.info("Watching %s and its subdirectories for changes...", watch_path)
    run_process(watch_path, recursive=True, target=start)


if __name__ == "__main__":
    # Simple direct execution
    start()
