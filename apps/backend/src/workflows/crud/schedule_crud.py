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
    from src.functions.restack_engine import (
        RestackEngineApiInput,
        restack_engine_api_schedule,
    )
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


class FrontendScheduleEditInput(BaseModel):
    """Frontend input model for schedule spec editing."""
    task_id: str = Field(..., min_length=1)
    schedule_spec: dict[str, Any] = Field(..., description="New schedule specification")


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
class ScheduleEditWorkflow:
    """Workflow to edit a schedule spec in Temporal and update the database."""

    @workflow.run
    async def run(self, workflow_input: FrontendScheduleEditInput) -> ScheduleOutput:
        log.info("ScheduleEditWorkflow started")
        try:
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

            # Step 2: Convert frontend format to unified format
            unified_spec = UnifiedScheduleSpec.from_frontend_format(workflow_input.schedule_spec)

            # Step 3: Convert to the protobuf JSON format
            spec_dict = {}

            # Add timezone with the correct protobuf field name
            if unified_spec.time_zone:
                spec_dict["timezoneName"] = unified_spec.time_zone

            # Handle intervals
            if unified_spec.intervals:
                spec_dict["interval"] = []
                for interval in unified_spec.intervals:
                    # Parse the interval string to get seconds for protobuf Duration format
                    interval_str = interval.every.lower()
                    if interval_str.endswith("h"):
                        seconds = int(interval_str[:-1]) * 3600
                    elif interval_str.endswith("m"):
                        seconds = int(interval_str[:-1]) * 60
                    elif interval_str.endswith("s"):
                        seconds = int(interval_str[:-1])
                    elif interval_str.endswith("d"):
                        seconds = int(interval_str[:-1]) * 86400
                    else:
                        seconds = int(interval_str)

                    # Create protobuf IntervalSpec format
                    spec_dict["interval"].append({
                        "interval": f"{seconds}s"
                    })

            # Handle calendars (structured calendar format)
            if unified_spec.calendars:
                spec_dict["structuredCalendar"] = []
                for cal in unified_spec.calendars:
                    spec_dict["structuredCalendar"].append({
                        "dayOfWeek": [{"start": int(cal.day_of_week), "end": int(cal.day_of_week), "step": 1}],
                        "hour": [{"start": cal.hour, "end": cal.hour, "step": 1}],
                        "minute": [{"start": cal.minute, "end": cal.minute, "step": 1}]
                    })

            # Handle cron expressions
            if unified_spec.cron:
                spec_dict["cronString"] = [unified_spec.cron]

            # Step 4: Call Restack engine API to edit the schedule spec
            api_result = await workflow.step(
                function=restack_engine_api_schedule,
                function_input=RestackEngineApiInput(
                    action="edit",
                    schedule_id=schedule_id,
                    reason="Schedule spec updated from the backend",
                    schedule_spec=spec_dict
                ),
                start_to_close_timeout=timedelta(seconds=30),
            )
            log.info(f"Restack API call completed: {api_result}")

            # Step 5: Update database with new schedule spec
            backend_input = ScheduleUpdateInput(
                task_id=workflow_input.task_id,
                schedule_spec=unified_spec,
            )

            db_result = await workflow.step(
                function=schedule_update_workflow,
                function_input=backend_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            log.info(f"Database update completed: {db_result}")

            return ScheduleOutput(
                success=True,
                message="Schedule spec updated successfully",
                restack_schedule_id=schedule_id,
            )

        except Exception as e:
            error_message = f"Error during schedule edit: {e}"
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



