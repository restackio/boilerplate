"""Shared helpers for the Slack bot."""

import re
from typing import Any

BOT_MENTION_RE = re.compile(r"<@[\w]+>")


def extract_task_id(result: Any) -> str:
    """Pull the task id out of a TasksCreateWorkflow result (dict or object)."""
    if isinstance(result, dict):
        task = result.get("task", result)
        if isinstance(task, dict):
            return str(task.get("id", ""))
        return str(getattr(task, "id", ""))
    return str(getattr(result, "id", result))
