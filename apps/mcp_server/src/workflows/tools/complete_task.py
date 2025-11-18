"""Complete task workflow for MCP tool."""

from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field, field_validator
from restack_ai.workflow import NonRetryableError, log, workflow
from restack_ai.workflow import workflow_info


class SendAgentEventInput(BaseModel):
    event_name: str
    temporal_agent_id: str
    temporal_run_id: str | None = None
    event_input: dict[str, Any] | None = None

  
class TaskUpdateInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = Field(
        None,
        pattern="^(in_progress|in_review|closed|completed|failed)$",
    )
    agent_id: str | None = None
    assigned_to_id: str | None = None
    temporal_agent_id: str | None = None
    agent_state: dict | None = None
    # Subtask-related fields
    parent_task_id: str | None = None
    temporal_parent_agent_id: str | None = None
    # Schedule-related fields
    schedule_spec: dict | None = None
    schedule_task_id: str | None = None
    is_scheduled: bool | None = None
    schedule_status: str | None = Field(
        None, pattern="^(active|inactive|paused)$"
    )
    temporal_schedule_id: str | None = None

    @field_validator(
        "assigned_to_id",
        "agent_id",
        "schedule_task_id",
        "parent_task_id",
        "temporal_parent_agent_id",
        mode="before",
    )
    @classmethod
    def validate_optional_string_fields(
        cls, v: str | None
    ) -> str | None:
        """Convert empty strings to None for optional UUID fields."""
        if v == "":
            return None
        return v



class CompleteTaskInput(BaseModel):
    """Input for completing a task."""

    temporal_agent_id: str = Field(
        description="temporal_agent_id from meta_info (this is the Temporal agent ID to complete)"
    )
    temporal_run_id: str = Field(
        description="temporal_run_id from meta_info (this is the Temporal run ID to complete)"
    )
    result: str | None = Field(
        default=None,
        description="Optional completion message or result summary"
    )
    task_id: str = Field(
        description="task_id from meta_info (this is the ID of the task to complete)"
    )


class CompleteTaskOutput(BaseModel):
    """Result from completing a task."""

    status: str
    message: str


@workflow.defn(
    description="""Complete the current task and stop the agent.

    Use this when you have finished your work and want to mark the task as complete.
    If you are not sure if the task is complete, ask the user for confirmation.

    IMPORTANT: You must pass your temporal_agent_id, temporal_run_id and task_id from meta_info.

    Example: After completing a research task, call this to signal completion and mark task as completed.
    Example: When all subtasks are done and you're ready to finish.

    """
)
class CompleteTask:
    """MCP workflow to complete a task via agent event."""

    @workflow.run
    async def run(
        self, workflow_input: CompleteTaskInput
    ) -> CompleteTaskOutput:
        """Send end event to agent to mark task as complete.

        Uses the send_agent_event function to send an "end" event.
        The agent's temporal_agent_id and temporal_run_id come from meta_info that the LLM has access to.
        """
        log.info(
            f"CompleteTask workflow started for agent: {workflow_input.temporal_agent_id}"
        )
        try:
            # Prepare event input
            event_input = {}
            if workflow_input.result:
                event_input["result"] = workflow_input.result

            await workflow.child_execute(
              workflow="TasksUpdateWorkflow",
              workflow_id=f"task_update_{workflow_info().workflow_id}",
              workflow_input=TaskUpdateInput(
                task_id=workflow_input.task_id,
                status="completed",
              ),
            )

            return CompleteTaskOutput(
                status="completed",
                message=f"Task completion signal sent. Agent will stop running.",
            )

        except Exception as e:
            error_message = f"Error during complete_task: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
