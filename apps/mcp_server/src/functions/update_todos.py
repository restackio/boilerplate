"""Update todos function - sends event to agent state."""

from enum import Enum

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function, log

from src.client import client


class TodoStatus(str, Enum):
    """Status options for a todo item."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TodoItem(BaseModel):
    """A single todo item."""

    id: str = Field(
        ..., description="Unique identifier for the todo"
    )
    content: str = Field(
        ...,
        description="Short description of the todo (1 sentence)",
    )
    status: TodoStatus = Field(
        ..., description="Current status of the todo"
    )


class UpdateTodosFunctionInput(BaseModel):
    """Input for the update todos function."""

    todos: list[TodoItem] = Field(
        ...,
        description="List of current todos. Send full current list - agent maintains state.",
    )
    temporal_agent_id: str | None = Field(
        default=None, description="Temporal/Restack workflow ID"
    )
    temporal_run_id: str | None = Field(
        default=None, description="Temporal/Restack run ID"
    )


class UpdateTodosFunctionOutput(BaseModel):
    """Output from the update todos function."""

    success: bool = Field(
        ..., description="Whether the operation succeeded"
    )
    todos: list[TodoItem] = Field(
        ...,
        description="Current state of all todos (updated list will also appear in your message context)",
    )
    message: str = Field(
        ...,
        description="Progress summary (X/Y completed, N in progress)",
    )


@function.defn(name="updatetodos")
async def update_todos(
    function_input: UpdateTodosFunctionInput,
) -> UpdateTodosFunctionOutput:
    """Update task todos in agent state (simple, persistent).

    Just send the full current list each time:
    - Add new todo: include it with status "pending" or "in_progress"
    - Mark complete: change status to "completed"
    - Remove todo: exclude it from the list

    Fields: id (string), content (short, 1 sentence), status ("pending"|"in_progress"|"completed")

    After updating, todos appear in your message context automatically.

    Args:
        function_input: The complete current todo list

    Returns:
        UpdateTodosFunctionOutput with success status, current todos, and progress message
    """
    try:
        log.info(
            "update_todos function called",
            extra={"input": function_input.model_dump()},
        )

        # Validate required context from LLM
        if not function_input.temporal_agent_id:
            raise NonRetryableError(
                message="temporal_agent_id is required"
            )  # noqa: TRY301

        log.info(
            f"Sending todo_update event to agent workflow {function_input.temporal_agent_id}"
        )

        # Convert TodoItem objects to dicts for serialization
        todos_dicts = [
            todo.model_dump() for todo in function_input.todos
        ]

        # Send event to agent (full todo list - agent replaces its state)
        result = await client.send_agent_event(
            event_name="todo_update",
            agent_id=function_input.temporal_agent_id,
            run_id=function_input.temporal_run_id,
            event_input={
                "todos": todos_dicts,
            },
            wait_for_completion=True,  # Wait for agent to process and return result
        )

        log.info(
            "update_todos event sent successfully",
            extra={"result": result},
        )

        # Extract result from agent event response and convert back to TodoItems
        if result and isinstance(result, dict):
            result_todos = result.get("todos", [])
            todos_list = [
                TodoItem(**todo)
                if isinstance(todo, dict)
                else todo
                for todo in result_todos
            ]
            return UpdateTodosFunctionOutput(
                success=result.get("success", True),
                todos=todos_list,
                message=result.get(
                    "message", "Todos updated successfully"
                ),
            )
        return UpdateTodosFunctionOutput(
            success=True,
            todos=[],
            message="Todos updated (no response from agent)",
        )

    except Exception as e:  # noqa: BLE001
        error_message = f"Error in update_todos: {e!s}"
        log.error(error_message)
        return UpdateTodosFunctionOutput(
            success=False, todos=[], message=error_message
        )
