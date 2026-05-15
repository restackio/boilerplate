"""MCP tool for creating or updating a recurring schedule on an agent.

Two modes:
- Create: omit schedule_task_id; pass agent_id, title, description, schedule_spec.
  Creates a scheduled task via the backend TasksCreateWorkflow (template task), then
  attaches a Restack/Temporal schedule via ScheduleCreateWorkflow. Each fire creates
  a new child task that runs the given agent with the given description.
- Update: pass schedule_task_id; the cadence is changed via ScheduleEditWorkflow.

Note: creating a scheduled task also runs the agent ONCE immediately (existing
platform behavior of TasksCreateWorkflow). Subsequent runs happen on the cadence.
"""

from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    log,
    workflow,
    workflow_info,
)


class ScheduleCalendar(BaseModel):
    """One calendar entry (day-of-week + time)."""

    dayOfWeek: str = Field(  # noqa: N815 - matches frontend ScheduleSpec
        ...,
        pattern="^[0-6]$",
        description="Day of week as string: 0=Sunday, 1=Monday, ... 6=Saturday.",
    )
    hour: int = Field(
        ..., ge=0, le=23, description="Hour of day (0-23)."
    )
    minute: int = Field(
        default=0, ge=0, le=59, description="Minute (0-59)."
    )


class ScheduleInterval(BaseModel):
    """One interval entry."""

    every: str = Field(
        ...,
        description="Interval string: '5m', '15m', '1h', '6h', '1d', '2d', etc.",
    )


class ScheduleSpecInput(BaseModel):
    """Frontend-format schedule spec (camelCase, matches ScheduleSetupDialog).

    Provide exactly ONE of calendars, intervals, or cron. timeZone is required.
    """

    calendars: list[ScheduleCalendar] | None = Field(
        default=None,
        description="Calendar entries. Use this for fixed weekly times like 'Monday 09:00'.",
    )
    intervals: list[ScheduleInterval] | None = Field(
        default=None,
        description="Interval entries. Use this for cadences like 'every 1h' or 'every 2d'.",
    )
    cron: str | None = Field(
        default=None,
        description="Standard 5-field cron expression, e.g. '0 9 * * 1-5'.",
    )
    timeZone: str = Field(  # noqa: N815 - matches frontend ScheduleSpec
        default="UTC",
        description="IANA timezone name, e.g. 'UTC', 'Europe/Berlin', 'America/New_York'.",
    )


class UpdateScheduleInput(BaseModel):
    """Input for creating or updating a schedule on a task."""

    workspace_id: str = Field(
        ...,
        description="Workspace ID (from meta_info.workspace_id).",
    )
    schedule_task_id: str | None = Field(
        default=None,
        description="Existing scheduled-task id (returned from a previous updateschedule call). Omit to create a new schedule; pass to change the cadence of an existing one.",
    )
    agent_id: str | None = Field(
        default=None,
        description="Database UUID of the agent that should run on each fire (typically the pipeline PARENT agent that fans out subtasks). Required when creating.",
    )
    title: str | None = Field(
        default=None,
        max_length=255,
        description="Title shown for the scheduled task (and each scheduled child task). Required when creating.",
    )
    description: str | None = Field(
        default=None,
        description="Instructions/prompt the agent receives on each scheduled fire (e.g. the list of LinkedIn URLs to fan out). Required when creating.",
    )
    schedule_spec: ScheduleSpecInput = Field(
        ...,
        description="Cadence: provide one of calendars / intervals / cron, plus timeZone.",
    )
    assigned_to_id: str | None = Field(
        default=None,
        description="Optional user UUID assigned to each scheduled run.",
    )
    team_id: str | None = Field(
        default=None,
        description="Optional team UUID for the scheduled task.",
    )


class UpdateScheduleOutput(BaseModel):
    """Result of creating/updating a schedule."""

    success: bool = Field(
        ..., description="True if the schedule was created or updated."
    )
    schedule_task_id: str | None = Field(
        default=None,
        description="Database UUID of the scheduled (template) task. Pass this back to update the cadence later.",
    )
    restack_schedule_id: str | None = Field(
        default=None,
        description="Restack/Temporal schedule id; useful for ops/debugging.",
    )
    created: bool = Field(
        default=False,
        description="True if a new schedule was created; false if an existing one was updated.",
    )
    error: str | None = Field(
        default=None, description="Error message if failed."
    )


def _spec_to_frontend_dict(spec: ScheduleSpecInput) -> dict[str, Any]:
    """Convert ScheduleSpecInput to the dict shape expected by ScheduleCreate/Edit workflows."""
    out: dict[str, Any] = {"timeZone": spec.timeZone or "UTC"}
    if spec.calendars:
        out["calendars"] = [
            {
                "dayOfWeek": c.dayOfWeek,
                "hour": c.hour,
                "minute": c.minute,
            }
            for c in spec.calendars
        ]
        return out
    if spec.intervals:
        out["intervals"] = [
            {"every": i.every} for i in spec.intervals
        ]
        return out
    if spec.cron:
        out["cron"] = spec.cron
        return out
    msg = "schedule_spec must contain one of calendars, intervals, or cron"
    raise NonRetryableError(message=msg)


def _get(obj: Any, key: str) -> Any:
    """Read a field from either a Pydantic model or a dict (defensive)."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


@workflow.defn(
    mcp=True,
    description=(
        "Create or update a recurring schedule that fires the given agent on a cadence. "
        "Use AFTER the parent agent (and any child pipelines) have been created. "
        "Omit schedule_task_id to create a new schedule (must pass agent_id, title, description, schedule_spec). "
        "Pass schedule_task_id to change the cadence of an existing schedule. "
        "schedule_spec is the frontend format: { calendars: [{ dayOfWeek: '0'-'6', hour: 0-23, minute: 0-59 }] } OR { intervals: [{ every: '1h'|'2d'|'5m' }] } OR { cron: '0 9 * * 1-5' }, plus timeZone (IANA, default 'UTC'). "
        "Heads up: creating a scheduled task also runs the agent once immediately (existing platform behavior); subsequent runs happen on the cadence. Returns schedule_task_id for future edits."
    ),
)
class UpdateSchedule:
    """Workflow that creates or edits a Restack schedule on a task."""

    @workflow.run
    async def run(
        self, workflow_input: UpdateScheduleInput
    ) -> UpdateScheduleOutput:
        log.info(
            "UpdateSchedule started",
            workspace_id=workflow_input.workspace_id,
            updating=bool(workflow_input.schedule_task_id),
        )
        try:
            spec_dict = _spec_to_frontend_dict(
                workflow_input.schedule_spec
            )
            if workflow_input.schedule_task_id:
                return await self._edit_existing(
                    workflow_input.schedule_task_id, spec_dict
                )
            return await self._create_new(
                workflow_input, spec_dict
            )
        except NonRetryableError:
            raise
        except Exception as e:
            log.error("UpdateSchedule failed", error=str(e))
            raise NonRetryableError(
                message=f"Failed to create/update schedule: {e!s}"
            ) from e

    async def _create_new(
        self,
        workflow_input: UpdateScheduleInput,
        spec_dict: dict[str, Any],
    ) -> UpdateScheduleOutput:
        if not (
            workflow_input.agent_id
            and workflow_input.title
            and workflow_input.description
        ):
            return UpdateScheduleOutput(
                success=False,
                error="agent_id, title, and description are required when creating a new schedule",
            )

        task_input: dict[str, Any] = {
            "workspace_id": workflow_input.workspace_id,
            "title": workflow_input.title,
            "description": workflow_input.description,
            "status": "in_progress",
            "agent_id": workflow_input.agent_id,
            "is_scheduled": True,
            "schedule_status": "inactive",
            "schedule_spec": spec_dict,
        }
        if workflow_input.assigned_to_id:
            task_input["assigned_to_id"] = (
                workflow_input.assigned_to_id
            )
        if workflow_input.team_id:
            task_input["team_id"] = workflow_input.team_id

        parent_wf_id = workflow_info().workflow_id
        task_result = await workflow.child_execute(
            workflow="TasksCreateWorkflow",
            workflow_id=f"sched_task_create_{parent_wf_id}",
            workflow_input=task_input,
            task_queue="backend",
            start_to_close_timeout=timedelta(seconds=60),
        )

        task_obj = _get(task_result, "task")
        task_id = _get(task_obj, "id")
        if not task_id:
            return UpdateScheduleOutput(
                success=False,
                error="TasksCreateWorkflow did not return a task id",
            )
        task_id_str = str(task_id)

        schedule_result = await workflow.child_execute(
            workflow="ScheduleCreateWorkflow",
            workflow_id=f"sched_create_{task_id_str}_{parent_wf_id}",
            workflow_input={
                "task_id": task_id_str,
                "schedule_spec": spec_dict,
            },
            task_queue="backend",
            start_to_close_timeout=timedelta(seconds=60),
        )

        success = bool(_get(schedule_result, "success"))
        if not success:
            err = _get(schedule_result, "error") or _get(
                schedule_result, "message"
            )
            return UpdateScheduleOutput(
                success=False,
                schedule_task_id=task_id_str,
                error=str(err)
                if err
                else "ScheduleCreateWorkflow returned no success flag",
            )
        restack_id = _get(schedule_result, "restack_schedule_id")
        return UpdateScheduleOutput(
            success=True,
            schedule_task_id=task_id_str,
            restack_schedule_id=str(restack_id)
            if restack_id
            else None,
            created=True,
        )

    async def _edit_existing(
        self, task_id: str, spec_dict: dict[str, Any]
    ) -> UpdateScheduleOutput:
        parent_wf_id = workflow_info().workflow_id
        schedule_result = await workflow.child_execute(
            workflow="ScheduleEditWorkflow",
            workflow_id=f"sched_edit_{task_id}_{parent_wf_id}",
            workflow_input={
                "task_id": task_id,
                "schedule_spec": spec_dict,
            },
            task_queue="backend",
            start_to_close_timeout=timedelta(seconds=60),
        )
        success = bool(_get(schedule_result, "success"))
        if not success:
            err = _get(schedule_result, "error") or _get(
                schedule_result, "message"
            )
            return UpdateScheduleOutput(
                success=False,
                schedule_task_id=task_id,
                error=str(err)
                if err
                else "ScheduleEditWorkflow returned no success flag",
            )
        restack_id = _get(schedule_result, "restack_schedule_id")
        return UpdateScheduleOutput(
            success=True,
            schedule_task_id=task_id,
            restack_schedule_id=str(restack_id)
            if restack_id
            else None,
            created=False,
        )
