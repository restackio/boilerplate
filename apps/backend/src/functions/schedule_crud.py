import uuid
import re
from datetime import timedelta
from typing import Dict, Any

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from restack_ai.restack import ScheduleSpec, ScheduleCalendarSpec, ScheduleIntervalSpec
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.client import client
from src.database.connection import get_async_db
from src.database.models import Task


def parse_interval_string(interval_str: str) -> timedelta:
    """
    Convert interval string like '5m', '1h', '2d' to timedelta object.
    
    Supported formats:
    - s, sec, seconds: seconds
    - m, min, minutes: minutes  
    - h, hr, hours: hours
    - d, day, days: days
    """
    # Normalize the string
    interval_str = interval_str.strip().lower()
    
    # Regular expression to parse number and unit
    match = re.match(r'^(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|day|days?)$', interval_str)
    
    if not match:
        raise ValueError(f"Invalid interval format: {interval_str}. Expected format like '5m', '1h', '2d'")
    
    value = float(match.group(1))
    unit = match.group(2)
    
    # Convert to timedelta
    if unit in ('s', 'sec', 'second', 'seconds'):
        return timedelta(seconds=value)
    elif unit in ('m', 'min', 'minute', 'minutes'):
        return timedelta(minutes=value)
    elif unit in ('h', 'hr', 'hour', 'hours'):
        return timedelta(hours=value)
    elif unit in ('d', 'day', 'days'):
        return timedelta(days=value)
    else:
        raise ValueError(f"Unsupported time unit: {unit}")


# Unified schedule specification models
class ScheduleCalendar(BaseModel):
    """Calendar-based schedule specification."""
    day_of_week: str = Field(..., pattern="^[0-6]$", description="Day of week (0=Sunday, 6=Saturday)")
    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    minute: int = Field(default=0, ge=0, le=59, description="Minute of hour (0-59)")


class ScheduleInterval(BaseModel):
    """Interval-based schedule specification."""
    every: str = Field(..., description="Interval string (e.g., '5m', '1h', '2d')")


class UnifiedScheduleSpec(BaseModel):
    """Unified schedule specification that matches frontend, backend, and library formats."""
    calendars: list[ScheduleCalendar] | None = None
    intervals: list[ScheduleInterval] | None = None
    cron: str | None = None

    def to_restack_format(self) -> ScheduleSpec:
        """Convert to Restack ScheduleSpec format."""
        if self.calendars:
            return ScheduleSpec(
                calendars=[
                    ScheduleCalendarSpec(
                        day_of_week=cal.day_of_week,
                        hour=cal.hour,
                        minute=cal.minute
                    )
                    for cal in self.calendars
                ]
            )
        elif self.intervals:
            return ScheduleSpec(
                intervals=[
                    ScheduleIntervalSpec(every=parse_interval_string(interval.every))
                    for interval in self.intervals
                ]
            )
        elif self.cron:
            return ScheduleSpec(cron_expressions=[self.cron])
        else:
            raise ValueError("Schedule spec must have calendars, intervals, or cron")

    @classmethod
    def from_frontend_format(cls, spec: Dict[str, Any]) -> "UnifiedScheduleSpec":
        """Convert from frontend format to unified format."""
        if "calendars" in spec and spec["calendars"]:
            calendars = [
                ScheduleCalendar(
                    day_of_week=cal["dayOfWeek"],  # Frontend uses camelCase
                    hour=cal["hour"],
                    minute=cal.get("minute", 0)
                )
                for cal in spec["calendars"]
            ]
            return cls(calendars=calendars)
        elif "intervals" in spec and spec["intervals"]:
            intervals = [
                ScheduleInterval(every=interval["every"])
                for interval in spec["intervals"]
            ]
            return cls(intervals=intervals)
        elif "cron" in spec:
            return cls(cron=spec["cron"])
        else:
            raise ValueError("Invalid schedule specification format")

    def to_frontend_format(self) -> Dict[str, Any]:
        """Convert to frontend format."""
        if self.calendars:
            return {
                "calendars": [
                    {
                        "dayOfWeek": cal.day_of_week,  # Frontend expects camelCase
                        "hour": cal.hour,
                        "minute": cal.minute
                    }
                    for cal in self.calendars
                ]
            }
        elif self.intervals:
            return {
                "intervals": [
                    {"every": interval.every}
                    for interval in self.intervals
                ]
            }
        elif self.cron:
            return {"cron": self.cron}
        else:
            return {}


# Pydantic models for schedule operations
class ScheduleCreateInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    schedule_spec: UnifiedScheduleSpec = Field(..., description="Unified schedule specification")


class ScheduleUpdateInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    schedule_spec: UnifiedScheduleSpec | None = None
    schedule_status: str | None = Field(
        None, pattern="^(active|inactive|paused)$"
    )


class ScheduleControlInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    action: str = Field(..., pattern="^(start|stop|pause|resume|delete)$")


class ScheduleOutput(BaseModel):
    success: bool
    message: str | None = None
    restack_schedule_id: str | None = None


@function.defn()
async def schedule_create_workflow(
    schedule_input: ScheduleCreateInput,
) -> ScheduleOutput:
    """Create a scheduled workflow for a task using Restack."""
    async for db in get_async_db():
        try:
            # Get the task details
            task_query = (
                select(Task)
                .options(
                    selectinload(Task.agent),
                    selectinload(Task.assigned_to_user),
                    selectinload(Task.workspace),
                )
                .where(Task.id == uuid.UUID(schedule_input.task_id))
            )
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                raise NonRetryableError(
                    message=f"Task with id {schedule_input.task_id} not found"
                )

            # Use shared Restack client

            # Create the workflow input for task creation
            workflow_input = {
                "workspace_id": str(task.workspace_id),
                "title": task.title,
                "description": task.description,
                "status": "open",
                "agent_id": str(task.agent_id),
                "assigned_to_id": str(task.assigned_to_id) if task.assigned_to_id else None,
                "schedule_task_id": schedule_input.task_id,  # Reference to the original schedule task
                "is_scheduled": False,  # These are the created tasks from the schedule
            }

            # Convert unified schedule spec to Restack format
            schedule_config = schedule_input.schedule_spec.to_restack_format()

            # Schedule the workflow with Restack
            run_id = await client.schedule_workflow(
                workflow_name="TasksCreateWorkflow",
                workflow_id=f"scheduled_task_{task.id}_{uuid.uuid4()}",
                workflow_input=workflow_input,
                schedule=schedule_config,
            )

            # Update the original task to mark it as a schedule
            # Store in database using frontend format for consistency with UI
            task.schedule_spec = schedule_input.schedule_spec.to_frontend_format()
            task.is_scheduled = True
            task.schedule_status = "active"
            task.restack_schedule_id = run_id

            await db.commit()
            await db.refresh(task)

            return ScheduleOutput(
                success=True,
                message="Schedule created successfully",
                restack_schedule_id=run_id,
            )

        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to create schedule: {e!s}"
            ) from e
    return None


@function.defn()
async def schedule_update_workflow(
    schedule_input: ScheduleUpdateInput,
) -> ScheduleOutput:
    """Update a scheduled workflow."""
    async for db in get_async_db():
        try:
            # Get the task details
            task_query = select(Task).where(Task.id == uuid.UUID(schedule_input.task_id))
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                raise NonRetryableError(
                    message=f"Task with id {schedule_input.task_id} not found"
                )

            if not task.is_scheduled or not task.restack_schedule_id:
                raise NonRetryableError(
                    message="Task is not a scheduled task or missing schedule ID"
                )

            # Update task fields
            if schedule_input.schedule_spec:
                task.schedule_spec = schedule_input.schedule_spec.to_frontend_format()
            if schedule_input.schedule_status:
                task.schedule_status = schedule_input.schedule_status

            await db.commit()
            await db.refresh(task)

            return ScheduleOutput(
                success=True,
                message="Schedule updated successfully",
                restack_schedule_id=task.restack_schedule_id,
            )

        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to update schedule: {e!s}"
            ) from e
    return None


@function.defn()
async def schedule_control_workflow(
    control_input: ScheduleControlInput,
) -> ScheduleOutput:
    """Control a scheduled workflow (start, stop, pause, resume, delete)."""
    async for db in get_async_db():
        try:
            # Get the task details
            task_query = select(Task).where(Task.id == uuid.UUID(control_input.task_id))
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                raise NonRetryableError(
                    message=f"Task with id {control_input.task_id} not found"
                )

            if not task.is_scheduled:
                raise NonRetryableError(
                    message="Task is not a scheduled task"
                )

            # Update schedule status based on action
            action = control_input.action
            if action == "start" or action == "resume":
                task.schedule_status = "active"
                message = f"Schedule {action}ed successfully"
            elif action == "stop" or action == "pause":
                task.schedule_status = "paused"
                message = f"Schedule {action}ped successfully"
            elif action == "delete":
                task.schedule_status = "inactive"
                task.restack_schedule_id = None
                task.schedule_spec = None
                task.is_scheduled = False
                message = "Schedule deleted successfully"
            else:
                raise NonRetryableError(
                    message=f"Unknown action: {action}"
                )

            await db.commit()
            await db.refresh(task)

            return ScheduleOutput(
                success=True,
                message=message,
                restack_schedule_id=task.restack_schedule_id,
            )

        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to {control_input.action} schedule: {e!s}"
            ) from e
    return None
