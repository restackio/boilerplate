"""Service module for Slack bot with hot reloading support."""
import logging
from pathlib import Path

from watchfiles import run_process

logger = logging.getLogger(__name__)


def start() -> None:
    """Start the Slack bot in Socket Mode."""
    from .app import start_socket_mode
    
    logger.info("Starting Slack bot...")
    start_socket_mode()


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
    start()

