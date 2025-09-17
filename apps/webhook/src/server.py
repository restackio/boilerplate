"""Webhook server entry point and CLI commands."""
import logging
import webbrowser

import uvicorn

from .app import create_webhook_app

# Create logger for this module
logger = logging.getLogger(__name__)


def start() -> None:
    """Start webhook server (production mode)."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    logger.info("Starting Webhook Server on http://0.0.0.0:8000")

    app = create_webhook_app()

    uvicorn.run(
        app,
        host="0.0.0.0",  # noqa: S104 - Binding to all interfaces is intentional for containerized deployment
        port=8000,
        log_level="info",
        access_log=True,
    )


def dev() -> None:
    """Development mode with auto-reload."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    logger.info("Starting Webhook Server in development mode on http://127.0.0.1:8000")
    logger.info("Auto-reload enabled - server will restart on file changes")

    # Open webhook server docs in browser
    try:
        webbrowser.open("http://localhost:8000/docs")
    except OSError as e:
        logger.warning("Could not open browser: %s", e)

    # Use uvicorn's built-in reload functionality
    uvicorn.run(
        "src.app:create_webhook_app",
        factory=True,
        host="127.0.0.1",
        port=8000,
        log_level="info",
        access_log=True,
        reload=True,
        reload_dirs=["src"],
    )


if __name__ == "__main__":
    # Simple direct execution
    start()
