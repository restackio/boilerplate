"""Slack API helpers used by the agent-builder MCP tools.

These activities sit alongside ``slack_callback`` (which handles posting
messages and reactions). They're the read-side companions the build agent
uses conversationally: listing channels to bind and asking slack-bot for the
OAuth install URL when the workspace has no Slack installation yet.
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any

import httpx
from pydantic import BaseModel, Field
from restack_ai.function import function
from sqlalchemy import select

from src.database.connection import get_async_db
from src.database.models import Channel, ChannelIntegration
from src.functions.channels_crud import (
    _bot_token_from_credentials,
)
from src.functions.slack_callback import _resolve_bot_token

logger = logging.getLogger(__name__)

# Cap on concurrent conversations.info calls. Slack tier-3 limits are
# ~50 req/min per workspace, and we don't want a single page view to
# consume a meaningful fraction of that budget when an integration has
# many channels connected.
_REFRESH_CONCURRENCY = 5
# Hard ceiling on channels we'll refresh in one call — protects against
# pathological workspace shapes (hundreds of channels would otherwise
# hammer Slack). The integrations page is the canonical caller and shows
# nowhere near this many connected channels in practice.
_REFRESH_HARD_CAP = 100

SLACK_API_BASE = "https://slack.com/api"

# Default used when neither SLACK_BOT_URL nor NEXT_PUBLIC_SLACK_BOT_URL is set.
# Matches the dev-mode port in apps/slack-bot/src/config.py.
_DEFAULT_SLACK_BOT_URL = "http://localhost:3002"


def _slack_bot_internal_url() -> str:
    """Return the base URL the backend uses to reach the slack-bot service."""
    return (
        os.getenv("SLACK_BOT_URL")
        or os.getenv("NEXT_PUBLIC_SLACK_BOT_URL")
        or _DEFAULT_SLACK_BOT_URL
    ).rstrip("/")


# ── slack_list_conversations ────────────────────────────────────────


class SlackListConversationsInput(BaseModel):
    """Input for listing channels visible to the installation."""

    slack_team_id: str = Field(
        ...,
        description=(
            "Slack team/workspace id used to resolve the per-workspace bot "
            "token from channel_integrations.credentials."
        ),
    )
    workspace_id: str | None = Field(
        None,
        description=(
            "Restack workspace id. When provided, constrains token "
            "resolution to that workspace as defense-in-depth against "
            "cross-tenant token leakage."
        ),
    )
    include_private: bool = Field(
        default=True,
        description="Include private channels the bot is a member of.",
    )
    limit: int = Field(
        default=200,
        ge=1,
        le=1000,
        description="Maximum channels to return across pagination.",
    )


class SlackChannelSummary(BaseModel):
    id: str
    name: str
    is_private: bool = False
    is_member: bool = False


class SlackListConversationsOutput(BaseModel):
    ok: bool
    channels: list[SlackChannelSummary] = Field(
        default_factory=list
    )
    error: str | None = None
    # True when we fell back to public-only because the installation lacks
    # groups:read; lets callers nudge the user to reinstall if they need
    # private channels.
    private_channels_unavailable: bool = False


async def _fetch_conversations_page(
    client: httpx.AsyncClient,
    bot_token: str,
    *,
    types: str,
    limit: int,
    cursor: str,
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "types": types,
        "limit": limit,
        "exclude_archived": "true",
    }
    if cursor:
        params["cursor"] = cursor
    resp = await client.get(
        f"{SLACK_API_BASE}/conversations.list",
        params=params,
        headers={"Authorization": f"Bearer {bot_token}"},
    )
    return resp.json()


async def _collect_channels(
    client: httpx.AsyncClient,
    bot_token: str,
    *,
    types: str,
    cap: int,
    per_page: int,
) -> tuple[list[SlackChannelSummary], str | None]:
    """Page through conversations.list up to ``cap`` channels.

    Returns ``(channels, error)``. ``error`` is the Slack error code on the
    first failed call (e.g. ``"missing_scope"``), else ``None``.
    """
    channels: list[SlackChannelSummary] = []
    cursor = ""
    while len(channels) < cap:
        data = await _fetch_conversations_page(
            client,
            bot_token,
            types=types,
            limit=per_page,
            cursor=cursor,
        )
        if not data.get("ok"):
            return channels, data.get("error", "unknown_error")
        for ch in data.get("channels", []):
            channels.append(
                SlackChannelSummary(
                    id=ch.get("id", ""),
                    name=ch.get("name", ""),
                    is_private=bool(ch.get("is_private")),
                    is_member=bool(ch.get("is_member")),
                )
            )
            if len(channels) >= cap:
                break
        cursor = (data.get("response_metadata") or {}).get(
            "next_cursor", ""
        )
        if not cursor:
            break
    return channels, None


@function.defn()
async def slack_list_conversations(
    function_input: SlackListConversationsInput,
) -> SlackListConversationsOutput:
    """List Slack channels for a workspace (paginated, capped by ``limit``).

    If the installation lacks ``groups:read`` we silently fall back to
    public-only rather than failing the whole call — this keeps agent-builder
    flows usable for existing installs that predate the scope.
    """
    bot_token = await _resolve_bot_token(
        function_input.slack_team_id, function_input.workspace_id
    )
    if not bot_token:
        return SlackListConversationsOutput(
            ok=False, error="no_bot_token"
        )

    include_private = function_input.include_private
    types = "public_channel" + (
        ",private_channel" if include_private else ""
    )
    per_page = min(function_input.limit, 200)

    async with httpx.AsyncClient(timeout=15) as client:
        channels, error = await _collect_channels(
            client,
            bot_token,
            types=types,
            cap=function_input.limit,
            per_page=per_page,
        )
        private_unavailable = False
        if error == "missing_scope" and include_private:
            logger.info(
                "conversations.list missing_scope for private channels "
                "(team=%s) — retrying public-only",
                function_input.slack_team_id,
            )
            channels, error = await _collect_channels(
                client,
                bot_token,
                types="public_channel",
                cap=function_input.limit,
                per_page=per_page,
            )
            private_unavailable = error is None

    if error is not None:
        logger.warning(
            "conversations.list failed for team=%s: %s",
            function_input.slack_team_id,
            error,
        )
        return SlackListConversationsOutput(ok=False, error=error)

    return SlackListConversationsOutput(
        ok=True,
        channels=channels,
        private_channels_unavailable=private_unavailable,
    )


# ── slack_join_channel ──────────────────────────────────────────────


class SlackJoinChannelInput(BaseModel):
    """Input for joining a public Slack channel as the bot user."""

    slack_team_id: str = Field(
        ...,
        description=(
            "Slack team/workspace id used to resolve the per-workspace bot "
            "token from channel_integrations.credentials."
        ),
    )
    workspace_id: str | None = Field(
        None,
        description=(
            "Restack workspace id. When provided, constrains token "
            "resolution to that workspace as defense-in-depth against "
            "cross-tenant token leakage."
        ),
    )
    channel_id: str = Field(
        ...,
        description="Slack channel id (e.g. C01234ABC) to join.",
    )


class SlackJoinChannelOutput(BaseModel):
    ok: bool
    already_member: bool = False
    # True when Slack refused because the channel is private (bots can't
    # self-join private channels — a human must /invite them).
    requires_invite: bool = False
    # True when the installation lacks channels:join (likely a pre-scope
    # install). Caller should suggest a reinstall.
    missing_scope: bool = False
    error: str | None = None


@function.defn()
async def slack_join_channel(
    function_input: SlackJoinChannelInput,
) -> SlackJoinChannelOutput:
    """Have the bot join a public channel via ``conversations.join``.

    Slack returns ``already_in_channel`` (still ok=true) if the bot is
    already a member. Private channels return ``method_not_supported_for_
    channel_type`` or ``channel_not_found`` — surfaced as ``requires_invite``
    so the caller can ask the user to ``/invite @<bot>`` instead.
    """
    bot_token = await _resolve_bot_token(
        function_input.slack_team_id, function_input.workspace_id
    )
    if not bot_token:
        return SlackJoinChannelOutput(
            ok=False, error="no_bot_token"
        )

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{SLACK_API_BASE}/conversations.join",
            data={"channel": function_input.channel_id},
            headers={"Authorization": f"Bearer {bot_token}"},
        )
    data = resp.json()
    if data.get("ok"):
        return SlackJoinChannelOutput(
            ok=True,
            already_member=bool(data.get("already_in_channel")),
        )

    error = data.get("error", "unknown_error")
    requires_invite = error in {
        "method_not_supported_for_channel_type",
        "channel_not_found",
        "is_archived",
    }
    if requires_invite:
        logger.info(
            "conversations.join requires manual invite for channel=%s "
            "(team=%s): %s",
            function_input.channel_id,
            function_input.slack_team_id,
            error,
        )
    else:
        logger.warning(
            "conversations.join failed for channel=%s (team=%s): %s",
            function_input.channel_id,
            function_input.slack_team_id,
            error,
        )
    return SlackJoinChannelOutput(
        ok=False,
        requires_invite=requires_invite,
        missing_scope=error == "missing_scope",
        error=error,
    )


# ── slack_build_install_url ─────────────────────────────────────────


class SlackBuildInstallUrlInput(BaseModel):
    """Input for asking slack-bot to mint an OAuth install URL."""

    workspace_id: str = Field(
        ...,
        description="Restack workspace id; embedded as OAuth ``state``.",
    )


class SlackBuildInstallUrlOutput(BaseModel):
    ok: bool
    install_url: str | None = None
    error: str | None = None


@function.defn()
async def slack_build_install_url(
    function_input: SlackBuildInstallUrlInput,
) -> SlackBuildInstallUrlOutput:
    """Fetch the Slack OAuth install URL from slack-bot's internal endpoint.

    The URL itself is built by slack-bot so the Slack app identity
    (SLACK_CLIENT_ID + scopes + redirect URI) stays owned by a single
    service.
    """
    base = _slack_bot_internal_url()
    url = f"{base}/slack/internal/install-url"
    headers: dict[str, str] = {}
    api_key = os.getenv("SLACK_ROUTER_API_KEY")
    if api_key:
        headers["x-router-api-key"] = api_key

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                url,
                params={
                    "workspace_id": function_input.workspace_id
                },
                headers=headers,
            )
    except httpx.HTTPError as exc:
        logger.warning(
            "slack_build_install_url transport error: %s", exc
        )
        return SlackBuildInstallUrlOutput(
            ok=False, error=f"slack-bot unreachable: {exc}"
        )

    if resp.status_code != httpx.codes.OK:
        logger.warning(
            "slack_build_install_url non-200 response: status=%s body=%s",
            resp.status_code,
            resp.text[:200],
        )
        return SlackBuildInstallUrlOutput(
            ok=False,
            error=f"slack-bot returned status {resp.status_code}",
        )

    try:
        data = resp.json()
    except ValueError:
        return SlackBuildInstallUrlOutput(
            ok=False, error="slack-bot returned non-JSON response"
        )

    install_url = data.get("install_url")
    if not install_url:
        return SlackBuildInstallUrlOutput(
            ok=False,
            error=data.get(
                "error", "slack-bot did not return install_url"
            ),
        )
    return SlackBuildInstallUrlOutput(
        ok=True, install_url=install_url
    )


# ── slack_refresh_channel_names ─────────────────────────────────────


class SlackRefreshChannelNamesInput(BaseModel):
    """Input for refreshing display-name snapshots on connected channels."""

    channel_integration_id: str = Field(
        ...,
        min_length=1,
        description=(
            "ID of the channel_integrations row whose connected channels "
            "should be refreshed. The activity loads its credentials and "
            "calls conversations.info per connected channel."
        ),
    )


class SlackChannelNameRefresh(BaseModel):
    """Per-channel refresh outcome."""

    external_channel_id: str
    external_channel_name: str | None = None
    error: str | None = None


class SlackRefreshChannelNamesOutput(BaseModel):
    ok: bool
    refreshed: list[SlackChannelNameRefresh] = Field(
        default_factory=list
    )
    # Number of DB rows whose stored ``external_channel_name`` changed —
    # useful for cheap "did anything need updating?" telemetry.
    updated_count: int = 0
    error: str | None = None


async def _fetch_channel_info(
    client: httpx.AsyncClient,
    bot_token: str,
    channel_id: str,
    semaphore: asyncio.Semaphore,
) -> SlackChannelNameRefresh:
    """Call ``conversations.info`` for one channel under the rate-limit cap."""
    async with semaphore:
        try:
            resp = await client.get(
                f"{SLACK_API_BASE}/conversations.info",
                params={"channel": channel_id},
                headers={"Authorization": f"Bearer {bot_token}"},
            )
        except httpx.HTTPError as exc:
            return SlackChannelNameRefresh(
                external_channel_id=channel_id,
                error=f"transport_error: {exc}",
            )
    try:
        data = resp.json()
    except ValueError:
        return SlackChannelNameRefresh(
            external_channel_id=channel_id,
            error="non_json_response",
        )
    if not data.get("ok"):
        return SlackChannelNameRefresh(
            external_channel_id=channel_id,
            error=data.get("error", "unknown_error"),
        )
    name = (data.get("channel") or {}).get("name")
    return SlackChannelNameRefresh(
        external_channel_id=channel_id,
        external_channel_name=name
        if isinstance(name, str) and name
        else None,
    )


async def _load_integration_for_refresh(
    integration_uuid: uuid.UUID,
) -> tuple[
    str | None,
    list[tuple[uuid.UUID, str, str | None]],
    str | None,
]:
    """Return ``(bot_token, channels, error)`` for the refresh activity.

    Separated out so ``slack_refresh_channel_names`` stays under the
    cyclomatic-complexity limit. ``error`` is non-None only on failure;
    callers should short-circuit on it.
    """
    async for db in get_async_db():
        inst = (
            await db.execute(
                select(ChannelIntegration).where(
                    ChannelIntegration.id == integration_uuid
                )
            )
        ).scalar_one_or_none()
        if inst is None:
            return None, [], "integration_not_found"
        bot_token = _bot_token_from_credentials(inst.credentials)
        if not bot_token:
            return None, [], "no_bot_token"

        rows = (
            await db.execute(
                select(
                    Channel.id,
                    Channel.external_channel_id,
                    Channel.external_channel_name,
                ).where(
                    Channel.channel_integration_id
                    == integration_uuid
                )
            )
        ).all()
        return (
            bot_token,
            [
                (row[0], row[1], row[2])
                for row in rows[:_REFRESH_HARD_CAP]
            ],
            None,
        )
    return None, [], "db_unavailable"


async def _persist_channel_name_updates(
    channels: list[tuple[uuid.UUID, str, str | None]],
    refresh_results: list[SlackChannelNameRefresh],
) -> int:
    """Apply name changes to the DB; return the number of rows updated.

    Only updates rows whose Slack-reported name differs from the cached
    snapshot. Failures are logged and treated as "nothing updated"
    rather than propagated — the page still works with stale names.
    """
    by_external_id = {
        r.external_channel_id: r for r in refresh_results
    }
    updated_count = 0
    async for db in get_async_db():
        try:
            for row_id, ext_id, cached_name in channels:
                fresh = by_external_id.get(ext_id)
                if (
                    fresh is None
                    or fresh.external_channel_name is None
                ):
                    continue
                if fresh.external_channel_name == cached_name:
                    continue
                ch = (
                    await db.execute(
                        select(Channel).where(
                            Channel.id == row_id
                        )
                    )
                ).scalar_one_or_none()
                if ch is None:
                    continue
                ch.external_channel_name = (
                    fresh.external_channel_name
                )
                updated_count += 1
            if updated_count > 0:
                await db.commit()
        except Exception as e:  # noqa: BLE001
            await db.rollback()
            logger.warning(
                "slack_refresh_channel_names: failed to persist updates: %s",
                e,
            )
            return 0
    return updated_count


@function.defn()
async def slack_refresh_channel_names(
    function_input: SlackRefreshChannelNamesInput,
) -> SlackRefreshChannelNamesOutput:
    """Refresh the cached display names for every channel under an integration.

    Calls ``conversations.info`` for each connected channel (capped at
    ``_REFRESH_CONCURRENCY`` in flight) and updates the
    ``channels.external_channel_name`` column when the stored snapshot
    differs from what Slack reports. Returns the full set of fresh names
    so the caller can rerender immediately without re-querying the DB.

    Errors on individual channels (e.g. the bot was kicked out, channel
    archived) are surfaced per-row and do not fail the whole call.
    """
    try:
        integration_uuid = uuid.UUID(
            function_input.channel_integration_id
        )
    except ValueError:
        return SlackRefreshChannelNamesOutput(
            ok=False, error="invalid_channel_integration_id"
        )

    (
        bot_token,
        channels,
        error,
    ) = await _load_integration_for_refresh(integration_uuid)
    if error:
        return SlackRefreshChannelNamesOutput(
            ok=False, error=error
        )
    if not channels or not bot_token:
        return SlackRefreshChannelNamesOutput(ok=True)

    semaphore = asyncio.Semaphore(_REFRESH_CONCURRENCY)
    async with httpx.AsyncClient(timeout=10) as client:
        refresh_results = await asyncio.gather(
            *(
                _fetch_channel_info(
                    client, bot_token, ext_id, semaphore
                )
                for _row_id, ext_id, _cached_name in channels
            )
        )

    updated_count = await _persist_channel_name_updates(
        channels, refresh_results
    )

    return SlackRefreshChannelNamesOutput(
        ok=True,
        refreshed=refresh_results,
        updated_count=updated_count,
    )
