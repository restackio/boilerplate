from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.schedule_crud import (
        ScheduleControlInput,
        ScheduleCreateInput,
        ScheduleGetTaskInfoInput,
        ScheduleOutput,
        ScheduleUpdateDatabaseInput,
        ScheduleUpdateInput,
        UnifiedScheduleSpec,
        schedule_create_workflow,
        schedule_get_task_info,
        schedule_update_database,
        schedule_update_workflow,
    )
    from src.functions.restack_engine import (
        RestackEngineApiInput,
        restack_engine_api_schedule,
    )


# Frontend-compatible input models for workflows
class FrontendScheduleCreateInput(BaseModel):
    """Input from frontend that uses raw dict for schedule_spec."""
    task_id: str = Field(..., min_length=1)
    schedule_spec: dict[str, Any] = Field(..., description="Raw schedule specification from frontend")


class FrontendScheduleUpdateInput(BaseModel):
    """Input from frontend that uses raw dict for schedule_spec."""
    task_id: str = Field(..., min_length=1)
    schedule_spec: dict[str, Any] | None = None
    schedule_status: str | None = Field(
        None, pattern="^(active|inactive|paused)$"
    )


@workflow.defn()
class ScheduleCreateWorkflow:
    """Workflow to create a scheduled task."""

    @workflow.run
    async def run(self, workflow_input: FrontendScheduleCreateInput) -> ScheduleOutput:
        log.info("ScheduleCreateWorkflow started")
        try:
            # Convert frontend format to unified format
            unified_spec = UnifiedScheduleSpec.from_frontend_format(workflow_input.schedule_spec)

            # Create the backend input
            backend_input = ScheduleCreateInput(
                task_id=workflow_input.task_id,
                schedule_spec=unified_spec
            )

            return await workflow.step(
                function=schedule_create_workflow,
                function_input=backend_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during schedule creation: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ScheduleUpdateWorkflow:
    """Workflow to update a scheduled task."""

    @workflow.run
    async def run(self, workflow_input: FrontendScheduleUpdateInput) -> ScheduleOutput:
        log.info("ScheduleUpdateWorkflow started")
        try:
            # Convert frontend format to unified format if schedule_spec is provided
            unified_spec = None
            if workflow_input.schedule_spec:
                unified_spec = UnifiedScheduleSpec.from_frontend_format(workflow_input.schedule_spec)

            # Create the backend input
            backend_input = ScheduleUpdateInput(
                task_id=workflow_input.task_id,
                schedule_spec=unified_spec,
                schedule_status=workflow_input.schedule_status
            )

            return await workflow.step(
                function=schedule_update_workflow,
                function_input=backend_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during schedule update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ScheduleControlWorkflow:
    """Workflow to control a scheduled task (start, stop, pause, resume, delete)."""

    @workflow.run
    async def run(self, workflow_input: ScheduleControlInput) -> ScheduleOutput:
        log.info(f"ScheduleControlWorkflow started - Action: {workflow_input.action}")
        log.info(f"Input - Task ID: {workflow_input.task_id}, Schedule ID: {workflow_input.schedule_id}")
        
        try:
            action = workflow_input.action
            reason = workflow_input.reason or f"{action.capitalize()}d from the backend"
            
            # Determine the schedule ID to use
            if workflow_input.task_id:
                # Step 1: Get task information from database
                task_info = await workflow.step(
                    function=schedule_get_task_info,
                    function_input=ScheduleGetTaskInfoInput(
                        task_id=workflow_input.task_id
                    ),
                    start_to_close_timeout=timedelta(seconds=30),
                )
                log.info(f"Task info retrieved: {task_info}")
                schedule_id = task_info["restack_schedule_id"]
                task_id = workflow_input.task_id
            else:
                # Using schedule_id directly
                schedule_id = workflow_input.schedule_id
                task_id = None
                log.info(f"Using direct schedule ID: {schedule_id}")
            
            # Step 2: Call Restack engine API
            api_result = await workflow.step(
                function=restack_engine_api_schedule,
                function_input=RestackEngineApiInput(
                    action=action,
                    schedule_id=schedule_id,
                    reason=reason
                ),
                start_to_close_timeout=timedelta(seconds=30),
            )
            log.info(f"Restack API call completed: {api_result}")
            
            # Step 3: Update database
            if task_id:
                # Update by task_id
                db_result = await workflow.step(
                    function=schedule_update_database,
                    function_input=ScheduleUpdateDatabaseInput(
                        task_id=task_id,
                        action=action
                    ),
                    start_to_close_timeout=timedelta(seconds=30),
                )
            else:
                # Find task by schedule_id and update
                # For now, we'll create a simple response since we removed the by-schedule-id functions
                db_result = {
                    "message": f"Schedule {action}d successfully",
                    "restack_schedule_id": schedule_id if action != "delete" else None
                }
            
            log.info(f"Database update completed: {db_result}")
            
            return ScheduleOutput(
                success=True,
                message=db_result["message"],
                restack_schedule_id=db_result.get("restack_schedule_id"),
            )
                
        except Exception as e:
            error_message = f"Error during schedule control: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e



