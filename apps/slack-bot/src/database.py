"""Database helpers for Slack bot - uses Restack workflows instead of direct DB access."""

import logging
import os
from typing import Any

import asyncpg

from .config import config

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/boilerplate_postgres",
)


async def get_workspace_id_by_slack_team(team_id: str) -> str | None:
    """Look up the platform workspace_id for a given Slack team_id."""
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            result = await conn.fetchval(
                """
                SELECT workspace_id
                FROM user_oauth_connections
                WHERE provider_metadata->>'slack_team_id' = $1
                LIMIT 1
                """,
                team_id,
            )
            if result:
                workspace_id = str(result)
                logger.info(
                    "Found workspace %s for Slack team %s",
                    workspace_id,
                    team_id,
                )
                return workspace_id
        finally:
            await conn.close()
    except Exception:
        logger.exception("Error looking up workspace for team %s", team_id)

    return None


async def get_workspace_id_from_event(event: dict[str, Any]) -> str | None:
    """Extract workspace_id from a Slack event body."""
    team_id = event.get("team") or event.get("team_id")
    if not team_id:
        return None
    return await get_workspace_id_by_slack_team(team_id)


async def resolve_workspace_id(event: dict[str, Any]) -> str | None:
    """Resolve workspace_id from event, falling back to DEFAULT_WORKSPACE_ID."""
    ws = await get_workspace_id_from_event(event)
    if ws:
        return ws
    return config.DEFAULT_WORKSPACE_ID


async def get_task_by_thread_ts(thread_ts: str) -> dict[str, Any] | None:
    """Look up task by Slack thread_ts stored in metadata."""
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            row = await conn.fetchrow(
                """
                SELECT id, temporal_agent_id, status, agent_id, task_metadata
                FROM tasks
                WHERE task_metadata->>'slack_thread_ts' = $1
                ORDER BY created_at DESC
                LIMIT 1
                """,
                thread_ts,
            )
            if row:
                return dict(row)
        finally:
            await conn.close()
    except Exception:
        logger.exception("Error looking up task for thread %s", thread_ts)
    return None
