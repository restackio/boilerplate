"""Concierge LLM agent with a tool-calling loop.

Given a Slack message plus per-request context, this returns either:

* A natural-language reply to send back to the user, or
* A ``ConciergeResult`` describing a side effect that already happened
  (channel configured, task handed off), so the caller can also post a
  Block Kit confirmation if it wants.

The agent runs a bounded tool-calling loop (max ``MAX_STEPS`` turns) with
GPT-4o-mini. Tools are dispatched via :mod:`.tools`.

Safety / cost controls:

* Per-user rate limit (see :mod:`.rate_limit`).
* Hard step ceiling on the tool loop.
* Output token cap.
* Per-call HTTP timeout.
* Narrow system prompt (see ``SKILL.md``) that keeps the model on topic.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import httpx

from ...config import config
from . import rate_limit, tools

logger = logging.getLogger(__name__)

MAX_STEPS = 5
MAX_OUTPUT_TOKENS = 600
TIMEOUT_SECONDS = 20.0
MODEL = "gpt-4o-mini"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"

_SKILL_PATH = Path(__file__).parent / "SKILL.md"
_SYSTEM_PROMPT: str | None = None


def _load_system_prompt() -> str:
    global _SYSTEM_PROMPT
    if _SYSTEM_PROMPT is None:
        try:
            _SYSTEM_PROMPT = _SKILL_PATH.read_text(encoding="utf-8")
        except Exception:
            logger.exception("Failed to read concierge SKILL.md, using fallback")
            _SYSTEM_PROMPT = (
                "You are the Restack Slack concierge. Help users configure "
                "agents and channels. Keep replies short."
            )
    return _SYSTEM_PROMPT


class ConciergeResult:
    """Outcome of a concierge turn.

    Attributes:
        reply_text: The natural-language reply to send to Slack. Always
            non-empty when ``status == "ok"``.
        status: One of ``ok``, ``rate_limited``, ``not_configured``, ``error``.
        side_effects: List of ``{"tool": name, "result": ...}`` dicts for
            any tools that were invoked. Useful for UI hints.
    """

    __slots__ = ("reply_text", "status", "side_effects")

    def __init__(
        self,
        reply_text: str,
        status: str = "ok",
        side_effects: list[dict[str, Any]] | None = None,
    ) -> None:
        self.reply_text = reply_text
        self.status = status
        self.side_effects = side_effects or []


def _context_summary(context: dict[str, Any]) -> str:
    """A short natural-language note pinned to each conversation."""
    lines = [
        "Current context:",
        f"- Channel id: {context.get('channel_id', 'unknown')}",
        f"- Channel name: {context.get('channel_name') or '(dm)'}",
        f"- User: {context.get('user_name', 'unknown')}",
        f"- Dashboard URL: {context.get('dashboard_url', 'not set')}",
    ]
    if context.get("channel_id", "").startswith("D"):
        lines.append("- This is a DM with the bot.")
    else:
        lines.append("- This is a real channel (not a DM).")
    return "\n".join(lines)


async def run_concierge(
    *,
    user_message: str,
    context: dict[str, Any],
) -> ConciergeResult:
    """Run the concierge LLM loop for a single user message.

    ``context`` should contain:
        workspace_id, channel_integration_id, channel_id, channel_name,
        slack_user_id, user_name, thread_ts, dashboard_url
    """
    slack_user_id = context.get("slack_user_id", "anonymous")

    if not rate_limit.check_and_record(slack_user_id):
        return ConciergeResult(
            reply_text=(
                "You're sending me a lot of messages! Let's pause for a bit — "
                "try again in an hour. In the meantime, @mention one of your "
                "configured agents directly and they'll help you right away."
            ),
            status="rate_limited",
        )

    if not config.OPENAI_API_KEY:
        return ConciergeResult(
            reply_text=(
                "I'm not fully set up yet — the admin needs to configure an "
                "OpenAI API key for me. In the meantime, head to the "
                "dashboard to pick an agent for this channel."
            ),
            status="not_configured",
        )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": _load_system_prompt()},
        {"role": "system", "content": _context_summary(context)},
        {"role": "user", "content": user_message},
    ]

    side_effects: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as http:
        for step in range(MAX_STEPS):
            try:
                resp = await http.post(
                    OPENAI_URL,
                    headers={
                        "Authorization": f"Bearer {config.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": MODEL,
                        "messages": messages,
                        "tools": tools.TOOL_SCHEMAS,
                        "tool_choice": "auto",
                        "temperature": 0.3,
                        "max_tokens": MAX_OUTPUT_TOKENS,
                    },
                )
            except Exception as e:
                logger.warning("Concierge LLM call failed: %s", e)
                return ConciergeResult(
                    reply_text=(
                        "I hit a snag reaching the LLM. Try again in a "
                        "moment, or head to the dashboard to set things up."
                    ),
                    status="error",
                    side_effects=side_effects,
                )

            if resp.status_code != 200:
                logger.warning(
                    "Concierge LLM call non-200: %s %s",
                    resp.status_code,
                    resp.text[:200],
                )
                return ConciergeResult(
                    reply_text=(
                        "I hit a snag reaching the LLM. Try again in a "
                        "moment, or head to the dashboard to set things up."
                    ),
                    status="error",
                    side_effects=side_effects,
                )

            data = resp.json()
            choice = data.get("choices", [{}])[0]
            msg = choice.get("message", {})
            finish_reason = choice.get("finish_reason")

            tool_calls = msg.get("tool_calls") or []

            if not tool_calls:
                text = (msg.get("content") or "").strip()
                if not text:
                    text = (
                        "I'm here — what do you want to set up? I can list "
                        "your agents or configure this channel."
                    )
                return ConciergeResult(
                    reply_text=text,
                    status="ok",
                    side_effects=side_effects,
                )

            messages.append(
                {
                    "role": "assistant",
                    "content": msg.get("content") or "",
                    "tool_calls": tool_calls,
                }
            )

            for tc in tool_calls:
                fn = tc.get("function", {}) or {}
                name = fn.get("name", "")
                arguments = fn.get("arguments", "") or ""
                result_json = await tools.dispatch_tool_call(name, arguments, context)
                try:
                    side_effects.append(
                        {"tool": name, "result": json.loads(result_json)}
                    )
                except json.JSONDecodeError:
                    side_effects.append({"tool": name, "result": {"raw": result_json}})
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.get("id", ""),
                        "content": result_json,
                    }
                )

            if finish_reason == "stop":
                break

    return ConciergeResult(
        reply_text=(
            "I did a few things but got stuck in a loop. Head to the "
            "dashboard if you want to see the current state — or just ask "
            "me to list your agents and we'll start fresh."
        ),
        status="error",
        side_effects=side_effects,
    )
