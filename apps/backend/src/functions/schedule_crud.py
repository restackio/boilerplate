import re
import uuid
from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from restack_ai.restack import (
    ScheduleCalendarSpec,
    ScheduleIntervalSpec,
    ScheduleRange,
    ScheduleSpec,
)
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.client import client
from src.database.connection import get_async_db
from src.database.models import Task


def _raise_task_not_found(task_id: str) -> None:
    """Helper function to raise task not found error."""
    raise NonRetryableError(message=f"Task with id {task_id} not found")


def _raise_not_scheduled_task() -> None:
    """Helper function to raise not scheduled task error."""
    raise NonRetryableError(message="Task is not a scheduled task or missing schedule ID")


def _raise_not_scheduled_error() -> None:
    """Helper function to raise task not scheduled error."""
    raise NonRetryableError(message="Task is not a scheduled task")


def _raise_unknown_action(action: str) -> None:
    """Helper function to raise unknown action error."""
    raise NonRetryableError(message=f"Unknown action: {action}")


def parse_interval_string(interval_str: str) -> timedelta:
    """Convert interval string like '5m', '1h', '2d' to timedelta object.

    Supported formats:
    - s, sec, seconds: seconds
    - m, min, minutes: minutes
    - h, hr, hours: hours
    - d, day, days: days
    """
    # Normalize the string
    interval_str = interval_str.strip().lower()

    # Regular expression to parse number and unit
    match = re.match(r"^(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|day|days?)$", interval_str)

    if not match:
        msg = f"Invalid interval format: {interval_str}. Expected format like '5m', '1h', '2d'"
        raise ValueError(msg)

    value = float(match.group(1))
    unit = match.group(2)

    # Convert to timedelta
    if unit in ("s", "sec", "second", "seconds"):
        return timedelta(seconds=value)
    if unit in ("m", "min", "minute", "minutes"):
        return timedelta(minutes=value)
    if unit in ("h", "hr", "hour", "hours"):
        return timedelta(hours=value)
    if unit in ("d", "day", "days"):
        return timedelta(days=value)

    msg = f"Unsupported time unit: {unit}"
    raise ValueError(msg)


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
    time_zone: str | None = Field(
        default="UTC",
        description="IANA timezone name (e.g., 'America/New_York', 'Europe/London', 'UTC')"
    )

    def to_restack_format(self) -> ScheduleSpec:
        """Convert to Restack ScheduleSpec format with proper ScheduleRange objects."""
        if self.calendars:
            return ScheduleSpec(
                calendars=[
                    ScheduleCalendarSpec(
                        # Use ScheduleRange for each time component
                        day_of_week=[ScheduleRange(start=int(cal.day_of_week), end=int(cal.day_of_week), step=1)],
                        hour=[ScheduleRange(start=cal.hour, end=cal.hour, step=1)],
                        minute=[ScheduleRange(start=cal.minute, end=cal.minute, step=1)],
                    )
                    for cal in self.calendars
                ],
                time_zone_name=self.time_zone
            )
        if self.intervals:
            return ScheduleSpec(
                intervals=[
                    ScheduleIntervalSpec(every=parse_interval_string(interval.every))
                    for interval in self.intervals
                ],
                time_zone_name=self.time_zone
            )
        if self.cron:
            return ScheduleSpec(
                cron_expressions=[self.cron],
                time_zone_name=self.time_zone
            )

        msg = "Schedule spec must have calendars, intervals, or cron"
        raise ValueError(msg)

    @classmethod
    def from_frontend_format(cls, spec: dict[str, Any]) -> "UnifiedScheduleSpec":
        """Convert from frontend format to unified format."""
        # Extract timezone from spec, default to UTC
        time_zone = spec.get("timeZone", "UTC")

        calendars = spec.get("calendars")
        if calendars:
            calendar_list = [
                ScheduleCalendar(
                    day_of_week=cal["dayOfWeek"],  # Frontend uses camelCase
                    hour=cal["hour"],
                    minute=cal.get("minute", 0)
                )
                for cal in calendars
            ]
            return cls(calendars=calendar_list, time_zone=time_zone)

        intervals = spec.get("intervals")
        if intervals:
            interval_list = [
                ScheduleInterval(every=interval["every"])
                for interval in intervals
            ]
            return cls(intervals=interval_list, time_zone=time_zone)

        if "cron" in spec:
            return cls(cron=spec["cron"], time_zone=time_zone)

        msg = "Invalid schedule specification format"
        raise ValueError(msg)

    def to_frontend_format(self) -> dict[str, Any]:
        """Convert to frontend format."""
        base = {"timeZone": self.time_zone}

        if self.calendars:
            base["calendars"] = [
                {
                    "dayOfWeek": cal.day_of_week,  # Frontend expects camelCase
                    "hour": cal.hour,
                    "minute": cal.minute
                }
                for cal in self.calendars
            ]
        elif self.intervals:
            base["intervals"] = [
                {"every": interval.every}
                for interval in self.intervals
            ]
        elif self.cron:
            base["cron"] = self.cron

        return base


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
    task_id: str | None = Field(None, min_length=1, description="Task ID from database")
    schedule_id: str | None = Field(None, min_length=1, description="Restack schedule ID")
    action: str = Field(..., pattern="^(pause|resume|delete)$")
    reason: str | None = Field(None, description="Reason for the action")
    
    def model_post_init(self, __context) -> None:
        """Validate that either task_id or schedule_id is provided."""
        if not self.task_id and not self.schedule_id:
            raise ValueError("Either task_id or schedule_id must be provided")
        if self.task_id and self.schedule_id:
            raise ValueError("Only one of task_id or schedule_id should be provided")

class ScheduleUpdateDatabaseInput(BaseModel):
    """Input model for schedule database update operations."""
    task_id: str = Field(..., min_length=1)
    action: str = Field(..., pattern="^(pause|resume|delete)$")


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
                _raise_task_not_found(schedule_input.task_id)

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
                _raise_task_not_found(schedule_input.task_id)

            if not task.is_scheduled or not task.restack_schedule_id:
                _raise_not_scheduled_task()

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


class ScheduleGetTaskInfoInput(BaseModel):
    """Input model for getting task information."""
    task_id: str = Field(..., min_length=1)


@function.defn()
async def schedule_get_task_info(
    input_data: ScheduleGetTaskInfoInput,
) -> dict[str, Any]:
    """Get task information from database."""
    task_id = input_data.task_id
    async for db in get_async_db():
        try:
            # Get the task details
            task_query = select(Task).where(Task.id == uuid.UUID(task_id))
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                _raise_task_not_found(task_id)

            if not task.is_scheduled:
                _raise_not_scheduled_error()

            print(f"Retrieved task info - ID: {task.id}, Title: {task.title}")
            print(f"Restack Schedule ID: {task.restack_schedule_id}")
            print(f"Current Status: {task.schedule_status}")

            return {
                "task_id": str(task.id),
                "title": task.title,
                "restack_schedule_id": task.restack_schedule_id,
                "current_status": task.schedule_status,
                "is_scheduled": task.is_scheduled,
            }

        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get task info: {e!s}"
            ) from e
    return None


@function.defn()
async def schedule_update_database(
    input_data: ScheduleUpdateDatabaseInput,
) -> dict[str, Any]:
    """Update database after successful API call."""
    task_id = input_data.task_id
    action = input_data.action
    
    async for db in get_async_db():
        try:
            # Get the task again
            task_query = select(Task).where(Task.id == uuid.UUID(task_id))
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                _raise_task_not_found(task_id)

            print(f"Updating database for task {task_id} with action {action}")

            # Update database based on action
            if action == "resume":
                task.schedule_status = "active"
                message = "Schedule resumed successfully"
            elif action == "pause":
                task.schedule_status = "paused"
                message = "Schedule paused successfully"
            elif action == "delete":
                task.schedule_status = "inactive"
                task.restack_schedule_id = None
                task.schedule_spec = None
                task.is_scheduled = False
                message = "Schedule deleted successfully"
            else:
                _raise_unknown_action(action)

            await db.commit()
            await db.refresh(task)

            print(f"Database updated successfully - New status: {task.schedule_status}")

            return {
                "task_id": str(task.id),
                "new_status": task.schedule_status,
                "message": message,
                "restack_schedule_id": task.restack_schedule_id,
            }

        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to update database: {e!s}"
            ) from e
    return None



