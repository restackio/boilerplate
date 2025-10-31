"""Data models for webhook server."""

from typing import Any, Dict
from pydantic import BaseModel


class WebhookTaskInput(BaseModel):
    """Simple webhook input that creates a task."""

    task: str | None = None
    context: Dict[str, Any] | None = None


class TaskCreateInput(BaseModel):
    """Input for creating a task via Restack workflow."""

    workspace_id: str
    title: str
    description: str
    status: str = "open"
    agent_name: str
