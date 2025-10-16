"""Database helpers for Slack bot to look up workspace mappings."""
import logging
import os
from typing import Optional

import asyncpg

logger = logging.getLogger(__name__)


async def get_workspace_id_by_slack_team(team_id: str) -> Optional[str]:
    """
    Look up the platform workspace_id for a given Slack team_id.
    
    Args:
        team_id: Slack team ID (e.g., "T123ABC")
        
    Returns:
        workspace_id (UUID string) or None if not found
    """
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/boilerplate_postgres")
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Query for OAuth connection with this Slack team_id in provider_metadata
        query = """
            SELECT workspace_id 
            FROM user_oauth_connections 
            WHERE provider_metadata->>'slack_team_id' = $1
            LIMIT 1
        """
        
        result = await conn.fetchval(query, team_id)
        await conn.close()
        
        if result:
            workspace_id = str(result)
            logger.info(f"Found workspace {workspace_id} for Slack team {team_id}")
            return workspace_id
        else:
            logger.warning(f"No workspace found for Slack team {team_id}")
            return None
            
    except Exception as e:
        logger.exception(f"Error looking up workspace for team {team_id}: {e}")
        return None


async def get_workspace_id_from_event(event: dict) -> Optional[str]:
    """
    Extract workspace_id from a Slack event.
    
    Args:
        event: Slack event dict containing team_id
        
    Returns:
        workspace_id or None
    """
    # Slack events include team_id in different places
    team_id = event.get("team") or event.get("team_id")
    
    if not team_id:
        logger.error(f"No team_id found in event: {event}")
        return None
    
    return await get_workspace_id_by_slack_team(team_id)


async def get_task_id_by_thread_ts(thread_ts: str) -> Optional[str]:
    """
    Look up the task_id for a given Slack thread_ts.
    
    Args:
        thread_ts: Slack thread timestamp (e.g., "1760651617.139799")
        
    Returns:
        task_id (UUID string) or None if not found
    """
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/boilerplate_postgres")
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Query for task with this thread_ts in metadata
        query = """
            SELECT id 
            FROM tasks 
            WHERE metadata->>'slack_thread_ts' = $1
            ORDER BY created_at DESC
            LIMIT 1
        """
        
        result = await conn.fetchval(query, thread_ts)
        await conn.close()
        
        if result:
            task_id = str(result)
            logger.info(f"Found task {task_id} for thread {thread_ts}")
            return task_id
        else:
            logger.warning(f"No task found for thread {thread_ts}")
            return None
            
    except Exception as e:
        logger.exception(f"Error looking up task for thread {thread_ts}: {e}")
        return None

