"""Slack Bolt app configuration with Socket Mode."""

import logging
import sys

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

from .config import config

logging.basicConfig(
    level=config.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app: App | None = None

if not config.is_configured():
    logger.warning(
        "Slack credentials not configured. "
        "Set SLACK_BOT_TOKEN, SLACK_APP_TOKEN, and SLACK_SIGNING_SECRET. "
        "See SETUP.md for instructions."
    )
else:
    app = App(
        token=config.SLACK_BOT_TOKEN,
        signing_secret=config.SLACK_SIGNING_SECRET,
    )

if app is not None:
    from .listeners import actions, commands, events  # noqa: F401

    logger.info("Slack bot listeners registered")


def start_socket_mode() -> None:
    """Start the app in Socket Mode (WebSocket, no public URL needed)."""
    if app is None:
        logger.info(
            "Slack bot not configured -- exiting cleanly. "
            "Set SLACK_BOT_TOKEN, SLACK_APP_TOKEN, and SLACK_SIGNING_SECRET to enable."
        )
        sys.exit(0)

    if not config.SLACK_APP_TOKEN:
        logger.info(
            "SLACK_APP_TOKEN not set -- exiting cleanly. Required for Socket Mode."
        )
        sys.exit(0)

    handler = SocketModeHandler(app, config.SLACK_APP_TOKEN)
    logger.info("Slack bot is running in Socket Mode")
    handler.start()
