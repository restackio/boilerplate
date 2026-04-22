"""Clean up stale Slack installations when Slack signals they're gone.

Two paths remove a stored ``slack_installations`` row:

1. **Push** — Slack sends ``app_uninstalled`` / ``tokens_revoked`` events
   when the admin removes the app or revokes tokens. Handlers in
   ``listeners/events/app_lifecycle.py`` call :func:`drop_installation`.

2. **Pull (safety net)** — if the bot token is missed and we try to call
   a Slack API that returns a revoked-auth error
   (``invalid_auth``, ``token_revoked``, etc.), the calling handler uses
   :func:`maybe_handle_auth_failure` to clean up.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from ..config import config

logger = logging.getLogger(__name__)

# Slack error codes that mean "this bot token is no longer usable".
# https://api.slack.com/methods/auth.test#errors
REVOKED_AUTH_ERRORS: frozenset[str] = frozenset(
    {
        "invalid_auth",
        "account_inactive",
        "token_revoked",
        "token_expired",
        "not_authed",
        "team_disabled",
    }
)


def is_revoked_auth_error(err_code: str | None) -> bool:
    """Return True when Slack's API error code indicates the token is dead."""
    return bool(err_code) and err_code in REVOKED_AUTH_ERRORS


async def drop_installation(team_id: str, reason: str) -> bool:
    """Delete the SlackInstallation row for ``team_id``.

    Safe to call repeatedly — the backend workflow raises
    ``NonRetryableError`` if the row is already gone, which we swallow.

    Returns True on successful delete, False on no-op / error.
    """
    if not team_id:
        logger.warning(
            "drop_installation called without team_id (reason=%s)", reason
        )
        return False

    from ..client import client as restack_client

    workflow_id = f"slack_uninstall_{team_id}_{uuid.uuid4().hex[:12]}"
    try:
        run_id = await restack_client.schedule_workflow(
            workflow_name="SlackInstallationDeleteWorkflow",
            workflow_id=workflow_id,
            workflow_input={"team_id": team_id},
            task_queue=config.RESTACK_TASK_QUEUE,
        )
        await restack_client.get_workflow_result(
            workflow_id=workflow_id, run_id=run_id
        )
    except Exception:
        # Row may already be gone (e.g. both app_uninstalled and
        # tokens_revoked arrive back-to-back); don't propagate.
        logger.info(
            "Could not drop installation for team %s (may already be gone); reason=%s",
            team_id,
            reason,
            exc_info=True,
        )
        return False

    logger.info(
        "Dropped Slack installation for team %s (reason=%s)", team_id, reason
    )
    return True


def _extract_slack_error_code(exc: BaseException) -> str | None:
    """Best-effort extraction of the ``error`` field from a SlackApiError."""
    try:
        from slack_sdk.errors import SlackApiError
    except ImportError:
        return None

    if not isinstance(exc, SlackApiError):
        return None

    response: Any = getattr(exc, "response", None)
    if response is None:
        return None

    data = getattr(response, "data", None)
    if isinstance(data, dict):
        code = data.get("error")
        if isinstance(code, str):
            return code
    return None


async def maybe_handle_auth_failure(
    team_id: str | None, exc: BaseException
) -> bool:
    """If ``exc`` is a revoked-auth SlackApiError, drop the installation.

    Returns True iff the installation was dropped as a result. Callers can
    use the return value to adapt their error messaging (e.g. tell the user
    to re-install instead of showing a generic failure).
    """
    code = _extract_slack_error_code(exc)
    if not is_revoked_auth_error(code):
        return False

    if not team_id:
        logger.warning(
            "Slack revoked-auth error '%s' but no team_id available; "
            "cannot drop installation",
            code,
        )
        return False

    return await drop_installation(team_id, reason=f"api_error:{code}")
