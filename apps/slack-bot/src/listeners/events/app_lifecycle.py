"""Slack app lifecycle events: uninstall and token revocation.

When an admin removes the Restack app from their Slack workspace (or
revokes the bot's tokens), Slack delivers these events to our webhook.
We respond by deleting the local ``slack_installations`` row so the
dashboard reflects reality. Cascades remove ``slack_channel_agents`` too.

These events require a subscription in the Slack app configuration
(api.slack.com/apps → Event Subscriptions → Subscribe to bot events):

- ``app_uninstalled``
- ``tokens_revoked``

They do **not** require additional OAuth scopes.
"""

from __future__ import annotations

import asyncio
import logging

from ...app import app
from ...bot_services.lifecycle import drop_installation

logger = logging.getLogger(__name__)


def _team_id(body: dict, event: dict | None) -> str | None:
    """Slack puts team_id on the outer envelope for lifecycle events;
    some payloads also include it inside ``event``. Prefer the envelope."""
    return body.get("team_id") or (event or {}).get("team_id")


@app.event("app_uninstalled")
def handle_app_uninstalled(body, event):
    """Slack fires this when our app is removed from a workspace."""
    team_id = _team_id(body, event)
    if not team_id:
        logger.warning("app_uninstalled received without team_id")
        return
    asyncio.run(drop_installation(team_id, reason="app_uninstalled"))


@app.event("tokens_revoked")
def handle_tokens_revoked(body, event):
    """Slack fires this when bot or user tokens are revoked.

    ``event.tokens`` is a dict like ``{"bot": ["xoxb-..."], "oauth": [...]}``.
    We only drop the installation when **bot** tokens are revoked — user-only
    revocations leave the bot functional for routed channel/DM events.
    """
    team_id = _team_id(body, event)
    if not team_id:
        logger.warning("tokens_revoked received without team_id")
        return

    tokens = (event or {}).get("tokens") or {}
    bot_tokens = tokens.get("bot") or []
    if not bot_tokens:
        logger.info(
            "tokens_revoked for team %s affected only user tokens; install kept",
            team_id,
        )
        return

    asyncio.run(drop_installation(team_id, reason="tokens_revoked"))
