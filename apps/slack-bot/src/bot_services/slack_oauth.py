"""OAuth helpers for the Slack 'Add to Slack' flow.

Implements Slack OAuth 2.0 (v2) as described in the official guide:
https://docs.slack.dev/authentication/installing-with-oauth/

In particular:

- **Same ``redirect_uri`` in both steps** — the value sent to
  ``/oauth/v2/authorize`` must be identical to the one passed to
  ``oauth.v2.access``; otherwise Slack returns ``bad_redirect_uri``
  (see *Requesting scopes* → redirect URI in that doc).
- **``state``** — we encode a stable, parseable payload (platform workspace id
  and optional same-origin return URL) and must reject callbacks where
  ``state`` cannot be decoded to a valid workspace id. (Slack recommends
  checking ``state`` against what you sent to detect tampering; stricter
  options include a server-stored or signed nonce.)
- **User-visible completion** — after token exchange, we redirect the browser
  to the app (or show an error query param) so the user sees a clear result,
  as recommended in *Exchanging a temporary authorization code*.

**Authorization code lifetime:** Slack issues a short-lived ``code``; exchange
it promptly (defaults are fine for our callback latency).
"""

from __future__ import annotations

import base64
import binascii
import json
import logging
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import httpx

from ..config import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# OAuth state: workspace id + optional return URL (same-origin to FRONTEND_URL)
# ---------------------------------------------------------------------------


def default_return_path() -> str:
    return f"{config.FRONTEND_URL.rstrip('/')}/integrations/slack"


def is_allowed_return_url(url: str) -> bool:
    """Allow only same-origin as configured frontend (prevents open redirects)."""
    if not url or not config.FRONTEND_URL:
        return False
    try:
        base = urlparse(config.FRONTEND_URL.rstrip("/") + "/")
        p = urlparse(url)
    except (ValueError, OSError) as e:
        logger.debug("is_allowed_return_url: parse failed: %s", e)
        return False
    if p.scheme not in ("http", "https") or p.netloc != base.netloc:
        return False
    return True


def safe_return_url(url: str | None) -> str:
    """Default to Integrations if missing or not same-origin as FRONTEND_URL."""
    if url and is_allowed_return_url(url):
        return url
    if url and not is_allowed_return_url(url):
        logger.warning("Ignoring unsafe return_url (not same origin as FRONTEND_URL)")
    return default_return_path()


def encode_oauth_state(workspace_id: str, return_url: str | None) -> str:
    payload: dict[str, str] = {"w": workspace_id}
    if return_url:
        payload["r"] = return_url
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    token = base64.urlsafe_b64encode(raw).decode("ascii")
    return token.rstrip("=")


def _try_parse_state_payload(s: str) -> dict | None:
    p = s + ("=" * ((4 - len(s) % 4) % 4))
    try:
        raw = base64.urlsafe_b64decode(p.encode("ascii"))
    except (ValueError, TypeError, binascii.Error, UnicodeEncodeError) as e:
        logger.debug("state not valid base64url: %s", e)
        return None
    if not raw.startswith(b"{"):
        return None
    try:
        out = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return None
    return out if isinstance(out, dict) else None


def decode_oauth_state(state: str | None) -> tuple[str | None, str | None]:
    """Return (workspace_id, return_url). return_url was encoded by the frontend.

    Backward compatible: if ``state`` is a plain non-JSON value (legacy installs),
    the whole value is the workspace_id.
    """
    if not state or not (s := str(state).strip()):
        return None, None
    data = _try_parse_state_payload(s)
    if data and isinstance(data.get("w"), str):
        w: str = data["w"]
        r = data.get("r")
        r_str = r if isinstance(r, str) else None
        return w, r_str
    if s:
        return s, None
    return None, None


def append_oauth_result_to_return_url(
    return_url: str,
    *,
    success: bool,
    error: str | None = None,
    ensure_workspace_id: str | None = None,
) -> str:
    """Add ``slack_connected=1`` or ``slack_error=...``; remove prior ``slack_*`` query keys.

    If ``ensure_workspace_id`` is set, set or replace the ``workspaceId`` query
    param so the post-OAuth URL still deep-links to onboarding (state ``w`` is
    the source of truth; the encoded return_url can lag the address bar).
    """
    p = urlparse(return_url)
    pairs = [
        (k, v)
        for k, v in parse_qsl(p.query, keep_blank_values=True)
        if not k.startswith("slack_")
    ]
    if ensure_workspace_id:
        pairs = [(k, v) for k, v in pairs if k != "workspaceId"]
        pairs.append(("workspaceId", ensure_workspace_id))
    if success:
        pairs.append(("slack_connected", "1"))
    else:
        pairs.append(("slack_error", error or "unknown"))
    newquery = urlencode(pairs, doseq=True, safe="/")
    return urlunparse((p.scheme, p.netloc, p.path, p.params, newquery, p.fragment))


SLACK_OAUTH_SCOPES = (
    "app_mentions:read,"
    "channels:history,"
    "channels:join,"
    "channels:manage,"
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


def build_authorize_url(workspace_id: str, return_url: str | None = None) -> str:
    """Build the Slack OAuth authorize URL.

    ``state`` is base64url JSON with ``w`` = platform workspace id and
    optional ``r`` = same-origin return URL for post-install redirect.
    """
    redirect_uri = f"{config.SLACK_HTTP_BASE_URL}/slack/oauth/callback"
    st = encode_oauth_state(workspace_id, return_url)
    params = urlencode(
        {
            "client_id": config.SLACK_CLIENT_ID or "",
            "scope": SLACK_OAUTH_SCOPES,
            "redirect_uri": redirect_uri,
            "state": st,
        }
    )
    return f"https://slack.com/oauth/v2/authorize?{params}"
