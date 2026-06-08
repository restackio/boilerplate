"""Webhook server entry point and CLI commands."""

import logging
import os
import webbrowser

import uvicorn

from .app import create_webhook_app

# Create logger for this module
logger = logging.getLogger(__name__)

# HTTP port the webhook server binds to. Defaults to 3000 to match the Helm
# chart's containerPort/ingress. Override with WEBHOOK_HTTP_PORT.
HTTP_PORT = int(os.getenv("WEBHOOK_HTTP_PORT", "3000"))


def start() -> None:
    """Start webhook server (production mode)."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    logger.info(
        "Starting Webhook Server on http://0.0.0.0:%d", HTTP_PORT
    )

    app = create_webhook_app()

    uvicorn.run(
        app,
        host="0.0.0.0",  # noqa: S104 - Binding to all interfaces is intentional for containerized deployment
        port=HTTP_PORT,
        log_level="info",
        access_log=True,
    )


def dev() -> None:
    """Development mode with auto-reload."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    logger.info(
        "Starting Webhook Server in development mode on http://127.0.0.1:%d",
        HTTP_PORT,
    )
    logger.info(
        "Auto-reload enabled - server will restart on file changes"
    )

    # Open webhook server docs in browser
    try:
        webbrowser.open(f"http://localhost:{HTTP_PORT}/docs")
    except OSError as e:
        logger.warning("Could not open browser: %s", e)

    # Use uvicorn's built-in reload functionality
    uvicorn.run(
        "src.app:create_webhook_app",
        factory=True,
        host="127.0.0.1",
        port=HTTP_PORT,
        log_level="info",
        access_log=True,
        reload=True,
        reload_dirs=["src"],
    )


if __name__ == "__main__":
    # Simple direct execution
    start()
