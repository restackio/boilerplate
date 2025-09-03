from datetime import timedelta
from typing import Dict, Any

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.schedule_crud import (
        ScheduleCreateInput,
        ScheduleUpdateInput,
        ScheduleControlInput,
        ScheduleOutput,
        UnifiedScheduleSpec,
        schedule_create_workflow,
        schedule_update_workflow,
        schedule_control_workflow,
    )


# Frontend-compatible input models for workflows
class FrontendScheduleCreateInput(BaseModel):
    """Input from frontend that uses raw dict for schedule_spec."""
    task_id: str = Field(..., min_length=1)
    schedule_spec: Dict[str, Any] = Field(..., description="Raw schedule specification from frontend")


class FrontendScheduleUpdateInput(BaseModel):
    """Input from frontend that uses raw dict for schedule_spec."""
    task_id: str = Field(..., min_length=1)
    schedule_spec: Dict[str, Any] | None = None
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
            
            result = await workflow.step(
                function=schedule_create_workflow,
                function_input=backend_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            return result
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
            
            result = await workflow.step(
                function=schedule_update_workflow,
                function_input=backend_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            return result
        except Exception as e:
            error_message = f"Error during schedule update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ScheduleControlWorkflow:
    """Workflow to control a scheduled task (start, stop, pause, resume, delete)."""

    @workflow.run
    async def run(self, workflow_input: ScheduleControlInput) -> ScheduleOutput:
        log.info("ScheduleControlWorkflow started")
        try:
            result = await workflow.step(
                function=schedule_control_workflow,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            return result
        except Exception as e:
            error_message = f"Error during schedule control: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
