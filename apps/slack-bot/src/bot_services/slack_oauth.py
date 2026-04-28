"""OAuth helpers for the Slack 'Add to Slack' flow."""

from __future__ import annotations

import logging
from urllib.parse import urlencode

import httpx

from ..config import config

logger = logging.getLogger(__name__)

SLACK_OAUTH_SCOPES = (
    "app_mentions:read,"
    "channels:history,"
    "channels:join,"
    "channels:read,"
    "chat:write,"
    "chat:write.public,"
    "groups:read,"
    "im:history,"
    "im:read,"
    "im:write,"
    "reactions:read,"
    "reactions:write,"
    "users:read"
)


async def exchange_oauth_code(code: str, redirect_uri: str) -> dict:
    """Exchange an OAuth authorization code for an access token.

    POSTs to Slack's oauth.v2.access endpoint and returns the raw JSON
    response which includes ``access_token``, ``team``, ``bot_user_id``, etc.
    """
    async with httpx.AsyncClient() as http:
        resp = await http.post(
            "https://slack.com/api/oauth.v2.access",
            data={
                "client_id": config.SLACK_CLIENT_ID,
                "client_secret": config.SLACK_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            timeout=10,
        )
        data = resp.json()
        if not data.get("ok"):
            logger.error("OAuth exchange failed: %s", data.get("error"))
        return data


def build_authorize_url(workspace_id: str) -> str:
    """Build the Slack OAuth authorize URL.

    ``workspace_id`` is passed as the ``state`` parameter so we can associate
    the resulting installation with the correct platform workspace.
    """
    redirect_uri = f"{config.SLACK_HTTP_BASE_URL}/slack/oauth/callback"
    params = urlencode(
        {
            "client_id": config.SLACK_CLIENT_ID or "",
            "scope": SLACK_OAUTH_SCOPES,
            "redirect_uri": redirect_uri,
            "state": workspace_id,
        }
    )
    return f"https://slack.com/oauth/v2/authorize?{params}"
