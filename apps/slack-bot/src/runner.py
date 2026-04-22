"""Service module for Slack bot with hot reloading support."""

import logging
from pathlib import Path

from watchfiles import run_process

from .config import config

logger = logging.getLogger(__name__)


def start() -> None:
    """Start the Slack bot in the configured mode (socket or http)."""
    if config.is_socket_mode():
        from .app import start_socket_mode

        logger.info("Starting Slack bot in Socket Mode...")
        start_socket_mode()
    else:
        _start_http_mode()


def _start_http_mode() -> None:
    """Start the HTTP event receiver for central-router forwarding."""
    import uvicorn

    from .http_receiver import create_http_app

    logger.info("Starting Slack bot in HTTP mode on port %d", config.HTTP_PORT)
    http_app = create_http_app()
    uvicorn.run(http_app, host="0.0.0.0", port=config.HTTP_PORT, log_level="info")


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
