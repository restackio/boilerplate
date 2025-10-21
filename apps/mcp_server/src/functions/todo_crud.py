"""Todo management functions for workflow state."""

from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import function


class TodoItem(BaseModel):
    """Single todo item."""

    id: str = Field(..., description="Unique ID for the todo")
    content: str = Field(
        ...,
        description="The description/content of the todo item",
    )
    status: str = Field(
        default="pending",
        description="Status: pending, in_progress, completed, cancelled",
    )
    priority: str = Field(
        default="medium",
        description="Priority: low, medium, high",
    )
    order_index: int = Field(
        default=0, description="Order position in the list"
    )
    metadata: dict[str, Any] | None = Field(
        default=None, description="Additional metadata"
    )


class TodoUpdateInput(BaseModel):
    """Input for updating a todo's status."""

    todo_id: str = Field(
        ..., description="The ID of the todo to update"
    )
    status: str = Field(
        ...,
        description="New status: pending, in_progress, completed, cancelled",
    )
    metadata: dict[str, Any] | None = Field(
        default=None, description="Optional metadata update"
    )


class TodoUpdateOutput(BaseModel):
    """Output from updating a todo."""

    success: bool = Field(
        ..., description="Whether the update succeeded"
    )
    message: str = Field(
        ..., description="Status message with progress summary"
    )


@function.defn()
async def todo_update_status(
    function_input: TodoUpdateInput,
) -> TodoUpdateOutput:
    """Helper function to validate todo status updates.

    This function is meant to be called from within a workflow that maintains
    todos in its state. It validates the status transition and returns helpful
    progress messages.

    The actual state update should be done in the workflow itself.
    """
    valid_statuses = [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
    ]
    if function_input.status not in valid_statuses:
        return TodoUpdateOutput(
            success=False,
            message=f"Invalid status: {function_input.status}. Must be one of: {', '.join(valid_statuses)}",
        )

    message = (
        f"✓ Todo {function_input.todo_id} marked as '{function_input.status}'.\n\n"
        "Remember to:\n"
        "1. Update the workflow state with the new todo status\n"
        "2. Proceed to the next pending todo if this one is completed\n"
        "3. Keep the todo list current as you work"
    )

    return TodoUpdateOutput(success=True, message=message)
