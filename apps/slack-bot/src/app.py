"""Slack Bolt app configuration with Socket Mode and HTTP Mode support."""

import logging
import os
import sys

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

from .config import config

logging.basicConfig(
    level=config.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Per-request token for HTTP mode
# ---------------------------------------------------------------------------
# In HTTP mode we handle OAuth ourselves and resolve the real bot token from
# the database on every incoming event.  Bolt's authorize callback reads this
# value so that every handler receives a client with the correct token.
# In Socket Mode the list is never read.

_pending_bot_token: list[str] = ["xoxb-pending"]


def set_pending_bot_token(token: str) -> None:
    """Store the resolved bot token so the next ``authorize`` call picks it up."""
    _pending_bot_token[0] = token


# ---------------------------------------------------------------------------
# App initialisation
# ---------------------------------------------------------------------------

app: App | None = None

if not config.is_configured():
    mode = "Socket" if config.is_socket_mode() else "HTTP"
    logger.warning(
        "Slack credentials not configured for %s mode. See SETUP.md for instructions.",
        mode,
    )
elif config.is_socket_mode():
    app = App(
        token=config.SLACK_BOT_TOKEN,
        signing_secret=config.SLACK_SIGNING_SECRET,
    )
else:
    # Hide SLACK_CLIENT_ID/SECRET during init so Bolt doesn't auto-enable its
    # built-in OAuth store.  We handle OAuth ourselves via http_receiver.py
    # and store installations in PostgreSQL.
    _saved_cid = os.environ.pop("SLACK_CLIENT_ID", None)
    _saved_csec = os.environ.pop("SLACK_CLIENT_SECRET", None)

    from slack_bolt.authorization import AuthorizeResult

    def _http_authorize(enterprise_id, team_id, **kwargs):
        return AuthorizeResult(
            enterprise_id=enterprise_id or "",
            team_id=team_id or "",
            bot_token=_pending_bot_token[0],
            bot_user_id="",
        )

    app = App(
        signing_secret=config.SLACK_SIGNING_SECRET or "placeholder",
        authorize=_http_authorize,
        token_verification_enabled=False,
        request_verification_enabled=False,
    )

    if _saved_cid:
        os.environ["SLACK_CLIENT_ID"] = _saved_cid
    if _saved_csec:
        os.environ["SLACK_CLIENT_SECRET"] = _saved_csec

# ---------------------------------------------------------------------------
# Listener registration
# ---------------------------------------------------------------------------

if app is not None:
    from .listeners import actions, commands, events  # noqa: F401

    logger.info("Slack bot listeners registered")


# ---------------------------------------------------------------------------
# Socket Mode entry-point
# ---------------------------------------------------------------------------


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
