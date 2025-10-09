"""Tracing context management using contextvars.

This module provides a clean way to pass tracing context through the call stack
without polluting workflows with SDK imports. Functions can access tracing context
and self-report their execution.

Architecture:
- Workflow: Sets simple context (task_id, agent_id, etc.) - NO SDK imports
- Functions: Access context and self-trace using SDK - SDK imports here
- Result: Clean separation, Temporal-safe, easy to maintain
"""

import contextvars
from dataclasses import dataclass
from typing import Any

# Context variable for tracing metadata (thread-safe)
_tracing_context: contextvars.ContextVar[dict[str, Any] | None] = contextvars.ContextVar(
    "tracing_context",
    default=None,
)


@dataclass
class TracingContext:
    """Lightweight tracing context (no SDK dependencies).
    
    This can safely be used in workflows - it's just data.
    """
    workflow_name: str
    task_id: str | None = None
    agent_id: str | None = None
    workspace_id: str | None = None
    user_id: str | None = None
    enabled: bool = True
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dict for serialization."""
        return {
            "workflow_name": self.workflow_name,
            "task_id": self.task_id,
            "agent_id": self.agent_id,
            "workspace_id": self.workspace_id,
            "user_id": self.user_id,
            "enabled": self.enabled,
        }


def set_tracing_context(context: TracingContext) -> contextvars.Token:
    """Set the tracing context for current execution.
    
    This should be called at the start of a workflow.
    Returns a token that can be used to reset context.
    """
    return _tracing_context.set(context.to_dict())


def get_tracing_context() -> dict[str, Any] | None:
    """Get the current tracing context.
    
    Functions use this to access workflow metadata for tracing.
    Returns None if no context is set.
    """
    return _tracing_context.get()


def reset_tracing_context(token: contextvars.Token) -> None:
    """Reset the tracing context using a token."""
    _tracing_context.reset(token)


def is_tracing_enabled() -> bool:
    """Check if tracing is currently enabled."""
    ctx = get_tracing_context()
    return ctx is not None and ctx.get("enabled", True)

