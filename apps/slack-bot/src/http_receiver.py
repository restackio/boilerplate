"""HTTP event receiver for the Slack bot.

Handles three concerns:
1. OAuth "Add to Slack" flow (authorize redirect + callback)
2. Slack signature verification (HMAC-SHA256) for direct-from-Slack events
3. Event / interaction dispatch via Bolt, with optional channel->agent routing
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import threading
import time
from collections import OrderedDict
from hmac import compare_digest
from typing import Any
from urllib.parse import parse_qs, unquote

from slack_bolt import App
from slack_bolt.request import BoltRequest
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, RedirectResponse
from starlette.routing import Route

from .config import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Idempotency: dedupe Slack event_ids across retries
# ---------------------------------------------------------------------------
#
# Slack's Events API retries delivery (up to 3 times) if it doesn't see a
# 200 within 3 seconds. Our handlers do workflow dispatch + LLM calls and
# routinely take longer, which used to cause duplicate tasks per message.
#
# Two-layer defense:
#   1. Fast-path: X-Slack-Retry-Num header set => retry; ack without work.
#   2. Fallback: remember recent event_ids for a short TTL and skip repeats.

_EVENT_ID_TTL_SECONDS = 300  # 5 minutes — longer than Slack's max retry window
_EVENT_ID_MAX_ENTRIES = 2048  # cap memory; oldest evicted first
_seen_events: OrderedDict[str, float] = OrderedDict()
_seen_events_lock = threading.Lock()


def _is_duplicate_event(event_id: str) -> bool:
    """Return True if this event_id was seen within the TTL window.

    Also records the event_id (first-seen semantics) and evicts stale entries.
    Thread-safe so it's usable from Starlette's async handlers.
    """
    if not event_id:
        return False
    now = time.time()
    with _seen_events_lock:
        # Evict expired entries (front of the OrderedDict is oldest).
        while _seen_events:
            oldest_id, ts = next(iter(_seen_events.items()))
            if now - ts < _EVENT_ID_TTL_SECONDS:
                break
            _seen_events.popitem(last=False)

        if event_id in _seen_events:
            _seen_events.move_to_end(event_id)
            return True

        _seen_events[event_id] = now
        if len(_seen_events) > _EVENT_ID_MAX_ENTRIES:
            _seen_events.popitem(last=False)
    return False


# ---------------------------------------------------------------------------
# Background dispatch: ack Slack in <100ms, run the handler async
# ---------------------------------------------------------------------------
#
# bolt_app.dispatch() is synchronous — it runs the @app.event handler to
# completion in the calling thread. Our handlers do workflow schedules + LLM
# calls that easily exceed Slack's 3s ack window. If we dispatch inline,
# Slack retries and we create duplicate tasks.
#
# Solution: ack Slack immediately in the HTTP handler, then run dispatch in
# a worker thread via asyncio.to_thread so the event loop stays responsive.

# Keep strong refs to pending tasks so they aren't garbage-collected mid-flight
# (asyncio only holds weak refs to fire-and-forget tasks).
_background_tasks: set[asyncio.Task[Any]] = set()


async def _dispatch_in_background(
    bolt_app: App,
    body_str: str,
    headers: dict[str, str],
    payload: dict[str, Any],
    slack_signed: bool,
) -> None:
    """Run channel routing + bolt_app.dispatch off the request thread.

    Any error here is swallowed (logged) because we've already returned 200
    to Slack; there's no one to report back to.
    """
    try:
        if slack_signed:
            try:
                event_data = payload.get("event", {})
                team_id = payload.get("team_id", "")
                channel_id = event_data.get("channel", "")
                if team_id and channel_id:
                    from .bot_services.channel_router import route_slack_event

                    route = await route_slack_event(team_id, channel_id)
                    if route and route.get("bot_token"):
                        _set_bolt_token(bolt_app, route["bot_token"])
            except Exception:
                logger.debug("Channel routing skipped for this event", exc_info=True)

        bot_token = headers.get("x-bot-token")
        if bot_token:
            _set_bolt_token(bolt_app, bot_token)

        bolt_req = BoltRequest(body=body_str, headers=headers)
        # dispatch() is sync and may block for seconds — run it off-loop so
        # other incoming Slack events can still be accepted.
        await asyncio.to_thread(bolt_app.dispatch, bolt_req)
    except Exception:
        logger.exception("Background Slack event dispatch failed")


def _schedule_background(coro: Any) -> None:
    """Fire-and-forget a coroutine while keeping a strong reference to it."""
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------


def _validate_api_key(request: Request) -> bool:
    expected = config.SLACK_ROUTER_API_KEY or ""
    actual = request.headers.get("x-router-api-key", "")
    return bool(expected and compare_digest(expected, actual))


def _verify_slack_signature(
    signing_secret: str,
    timestamp: str,
    body: bytes,
    signature: str,
) -> bool:
    """Verify a request actually came from Slack using HMAC-SHA256."""
    if abs(time.time() - int(timestamp)) > 60 * 5:
        return False
    sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
    computed = (
        "v0="
        + hmac.new(
            signing_secret.encode(),
            sig_basestring.encode(),
            hashlib.sha256,
        ).hexdigest()
    )
    return compare_digest(computed, signature)


def _is_slack_signed(request: Request, raw_body: bytes) -> bool:
    """Return True if the request carries a valid Slack signature."""
    ts = request.headers.get("x-slack-request-timestamp", "")
    sig = request.headers.get("x-slack-signature", "")
    if not ts or not sig or not config.SLACK_SIGNING_SECRET:
        return False
    return _verify_slack_signature(config.SLACK_SIGNING_SECRET, ts, raw_body, sig)


# ---------------------------------------------------------------------------
# Token propagation
# ---------------------------------------------------------------------------


def _set_bolt_token(bolt_app: App, token: str) -> None:
    """Propagate a resolved bot token to both Bolt's client and authorize layer."""
    from .app import set_pending_bot_token

    bolt_app.client.token = token
    set_pending_bot_token(token)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


async def health(_request: Request) -> JSONResponse:
    return JSONResponse({"status": "healthy", "mode": "http"})


# ---------------------------------------------------------------------------
# OAuth endpoints
# ---------------------------------------------------------------------------


async def oauth_authorize(request: Request) -> RedirectResponse | JSONResponse:
    """GET /slack/oauth/authorize?workspace_id=... -> redirect to Slack."""
    from .bot_services.slack_oauth import build_authorize_url

    workspace_id = request.query_params.get("workspace_id")
    if not workspace_id:
        return JSONResponse(
            {"error": "workspace_id query parameter is required"},
            status_code=400,
        )
    if not config.SLACK_CLIENT_ID:
        return JSONResponse(
            {"error": "SLACK_CLIENT_ID is not configured"},
            status_code=500,
        )
    return_url = request.query_params.get("return_url")
    url = build_authorize_url(workspace_id, return_url=return_url)
    return RedirectResponse(url=url)


async def install_url(request: Request) -> JSONResponse:
    """GET /slack/internal/install-url?workspace_id=... -> {install_url}.

    Used by the backend (agent-builder MCP tool) so Slack app identity
    (SLACK_CLIENT_ID + scopes + redirect URI) stays owned by slack-bot.

    Auth model:
    - If ``SLACK_ROUTER_API_KEY`` is configured, require the ``x-router-api-key``
      header to match (same as other internal endpoints).
    - Otherwise (dev), allow the call through. The returned URL carries no
      secrets beyond what ``/slack/oauth/authorize`` already exposes to end
      users.
    """
    from .bot_services.slack_oauth import build_authorize_url

    if config.SLACK_ROUTER_API_KEY and not _validate_api_key(request):
        return JSONResponse({"error": "unauthorized"}, status_code=401)

    workspace_id = request.query_params.get("workspace_id")
    if not workspace_id:
        return JSONResponse(
            {"error": "workspace_id query parameter is required"},
            status_code=400,
        )
    if not config.SLACK_CLIENT_ID:
        return JSONResponse(
            {"error": "SLACK_CLIENT_ID is not configured"},
            status_code=500,
        )
    return_url = request.query_params.get("return_url")
    return JSONResponse(
        {"install_url": build_authorize_url(workspace_id, return_url=return_url)}
    )


async def oauth_callback(request: Request) -> RedirectResponse | JSONResponse:
    """GET /slack/oauth/callback?code=...&state=... -> exchange + store + redirect."""
    from .bot_services.slack_oauth import (
        append_oauth_result_to_return_url,
        decode_oauth_state,
        exchange_oauth_code,
        safe_return_url,
    )
    from .client import client as restack_client

    code = request.query_params.get("code")
    state_raw = request.query_params.get("state")
    slack_err = request.query_params.get("error")
    workspace_id, return_url_from_state = decode_oauth_state(state_raw)
    redirect_to = safe_return_url(return_url_from_state)

    if slack_err or not code:
        err = slack_err or "missing_code"
        return RedirectResponse(
            url=append_oauth_result_to_return_url(
                redirect_to,
                success=False,
                error=err,
                ensure_workspace_id=workspace_id,
            ),
            status_code=303,
        )

    if not workspace_id:
        return JSONResponse(
            {"error": "invalid or missing state (workspace not associated)"},
            status_code=400,
        )

    # Must match the redirect_uri used in build_authorize_url (Slack:
    # https://docs.slack.dev/authentication/installing-with-oauth/ — same value
    # in authorize and oauth.v2.access or bad_redirect_uri).
    redirect_uri = f"{config.SLACK_HTTP_BASE_URL}/slack/oauth/callback"
    data = await exchange_oauth_code(code, redirect_uri)

    if not data.get("ok"):
        return RedirectResponse(
            url=append_oauth_result_to_return_url(
                redirect_to,
                success=False,
                error=str(data.get("error", "token_exchange_failed")),
                ensure_workspace_id=workspace_id,
            ),
            status_code=303,
        )

    team = data.get("team", {})
    bot_token = data.get("access_token")
    team_id = team.get("id")
    team_name = team.get("name")
    installer_user_id = (data.get("authed_user") or {}).get("id")

    install_stored = False
    upsert_error: str | None = None
    try:
        wf_id = f"slack_install_{team_id}_{int(time.time())}"
        run_id = await restack_client.schedule_workflow(
            workflow_name="ChannelIntegrationUpsertWorkflow",
            workflow_id=wf_id,
            workflow_input={
                "workspace_id": workspace_id,
                "channel_type": "slack",
                "external_id": team_id,
                "credentials": {"bot_token": bot_token},
            },
            task_queue=config.RESTACK_TASK_QUEUE,
        )
        upsert_result = await restack_client.get_workflow_result(
            workflow_id=wf_id, run_id=run_id
        )
        # The workflow returns a structured result. Soft-failures (e.g.
        # "this Slack workspace is already linked to a different Restack
        # workspace") come back as ``error="already_connected_elsewhere"``
        # instead of an exception so we can render a useful page.
        if isinstance(upsert_result, dict):
            upsert_error = upsert_result.get("error")
        else:
            upsert_error = getattr(upsert_result, "error", None)
        install_stored = upsert_error is None
    except Exception:
        logger.exception("Failed to store Slack installation for team %s", team_id)

    if upsert_error == "already_connected_elsewhere":
        # Don't ensure the default channel or send a welcome DM — the install
        # was rejected and no row exists for this Restack workspace.
        logger.warning(
            "Slack OAuth rejected: team %s is already connected to a "
            "different Restack workspace; refused takeover from "
            "workspace_id=%s",
            team_id,
            workspace_id,
        )
        return RedirectResponse(
            url=append_oauth_result_to_return_url(
                redirect_to,
                success=False,
                error="already_connected_elsewhere",
                ensure_workspace_id=workspace_id,
            ),
            status_code=303,
        )

    default_channel_id: str | None = None
    if install_stored and bot_token:
        try:
            from .bot_services.onboarding import ensure_default_restack_channel

            default_channel_id = await ensure_default_restack_channel(bot_token)
        except Exception:
            logger.exception(
                "Failed to ensure default #restack-agents channel for team %s", team_id
            )

    if install_stored and bot_token and installer_user_id:
        try:
            from .bot_services.onboarding import send_welcome_dm

            await send_welcome_dm(
                bot_token=bot_token,
                installer_user_id=installer_user_id,
                team_name=team_name or "your workspace",
                frontend_url=config.FRONTEND_URL,
                default_channel_id=default_channel_id,
            )
        except Exception:
            logger.exception(
                "Failed to send welcome DM after OAuth for team %s", team_id
            )

    if not install_stored:
        return RedirectResponse(
            url=append_oauth_result_to_return_url(
                redirect_to,
                success=False,
                error="link_failed",
                ensure_workspace_id=workspace_id,
            ),
            status_code=303,
        )

    return RedirectResponse(
        url=append_oauth_result_to_return_url(
            redirect_to, success=True, ensure_workspace_id=workspace_id
        ),
        status_code=303,
    )


# ---------------------------------------------------------------------------
# Event / interaction receivers
# ---------------------------------------------------------------------------


async def receive_event(request: Request) -> JSONResponse:
    raw_body = await request.body()

    slack_signed = _is_slack_signed(request, raw_body)
    api_key_ok = _validate_api_key(request)
    if not slack_signed and not api_key_ok:
        return JSONResponse({"error": "unauthorized"}, status_code=401)

    body_str = raw_body.decode("utf-8")

    try:
        payload = json.loads(body_str)
    except json.JSONDecodeError:
        return JSONResponse({"error": "invalid json"}, status_code=400)

    if payload.get("type") == "url_verification":
        return JSONResponse({"challenge": payload.get("challenge", "")})

    # Layer 1: Slack retried because it didn't see a 200 in time. The original
    # request is already being processed (or has finished); ack and bail so
    # we don't create duplicate tasks.
    retry_num = request.headers.get("x-slack-retry-num")
    if retry_num:
        logger.info(
            "Slack retry received (attempt=%s reason=%s); acking without reprocessing",
            retry_num,
            request.headers.get("x-slack-retry-reason", "unknown"),
        )
        return JSONResponse({"ok": True})

    # Layer 2: Dedupe by event_id within the TTL window. Guards against both
    # transport-level retries that arrived without the retry header and any
    # other source of duplicate delivery.
    event_id = payload.get("event_id")
    if event_id and _is_duplicate_event(event_id):
        logger.info("Duplicate Slack event_id=%s ignored", event_id)
        return JSONResponse({"ok": True})

    from .app import app as bolt_app

    if bolt_app is None:
        return JSONResponse({"error": "bot not initialized"}, status_code=503)

    # Ack Slack immediately and run the actual handler in the background.
    # Channel routing + token resolution also happens in the background task
    # because it touches the DB and can add latency of its own.
    _schedule_background(
        _dispatch_in_background(
            bolt_app=bolt_app,
            body_str=body_str,
            headers=dict(request.headers),
            payload=payload,
            slack_signed=slack_signed,
        )
    )
    return JSONResponse({"ok": True})


async def receive_interaction(request: Request) -> JSONResponse:
    raw_body = await request.body()

    slack_signed = _is_slack_signed(request, raw_body)
    api_key_ok = _validate_api_key(request)
    if not slack_signed and not api_key_ok:
        return JSONResponse({"error": "unauthorized"}, status_code=401)

    from .app import app as bolt_app

    if bolt_app is None:
        return JSONResponse({"error": "bot not initialized"}, status_code=503)

    body_str = raw_body.decode("utf-8")

    content_type = request.headers.get("content-type", "")
    if "application/x-www-form-urlencoded" in content_type:
        parsed = parse_qs(body_str)
        payload_list = parsed.get("payload", [])
        if payload_list:
            body_str = unquote(payload_list[0])

    # All of our @app.action handlers call bare ack() (no response body), so
    # it's safe to ack Slack immediately and run the handler in the background.
    # If a future handler needs to return a response_action/modal update body,
    # this will need to switch back to inline dispatch for that specific route.
    _schedule_background(
        _dispatch_in_background(
            bolt_app=bolt_app,
            body_str=body_str,
            headers=dict(request.headers),
            payload={},  # channel routing is unnecessary here; payload is URL-encoded
            slack_signed=False,  # skip route_slack_event for interactions
        )
    )
    return JSONResponse({"ok": True})


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------


def create_http_app() -> Starlette:
    return Starlette(
        routes=[
            Route("/health", health, methods=["GET"]),
            Route("/slack/events", receive_event, methods=["POST"]),
            Route("/slack/interactions", receive_interaction, methods=["POST"]),
            Route("/slack/oauth/authorize", oauth_authorize, methods=["GET"]),
            Route("/slack/oauth/callback", oauth_callback, methods=["GET"]),
            Route("/slack/internal/install-url", install_url, methods=["GET"]),
        ],
    )
