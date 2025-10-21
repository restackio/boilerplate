"""Data models for webhook server."""

from pydantic import BaseModel


class WebhookTaskInput(BaseModel):
    """Simple webhook input that creates a task."""

    title: str | None = None
    description: str | None = None


class TaskCreateInput(BaseModel):
    """Input for creating a task via Restack workflow."""

    workspace_id: str
    title: str
    description: str
    status: str = "open"
    agent_name: str
