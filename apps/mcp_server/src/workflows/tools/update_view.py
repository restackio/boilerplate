"""MCP tool for updating an existing view on the current Build task."""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow


class ViewColumnSpec(BaseModel):
    """Column definition for a view."""

    key: str = Field(..., description="Field key in the data")
    label: str = Field(..., description="Display label for the column")


class ViewSpec(BaseModel):
    """Single view definition stored in task.view_specs."""

    id: str = Field(..., description="Unique view id")
    name: str = Field(..., description="Display name")
    columns: list[ViewColumnSpec] = Field(default_factory=list)
    dataset_id: str = Field(..., description="Dataset UUID that backs this view")
    entity_id_field: str | None = Field(default=None)
    activity_filter: dict | None = Field(default=None)


class UpdateViewInput(BaseModel):
    """Input for updating a view on the Build task."""

    task_id: str = Field(
        ...,
        description="Build task ID (from meta_info.task_id)",
    )
    view_id: str = Field(
        ...,
        description="Id of the view to update",
    )
    view: ViewSpec = Field(
        ...,
        description="Updated view spec (id must match view_id)",
    )


class UpdateViewOutput(BaseModel):
    """Output after updating a view."""

    success: bool = Field(..., description="True if view was updated")
    view_id: str | None = Field(default=None)
    error: str | None = Field(default=None)


@workflow.defn(
    mcp=True,
    description="Create or update a view on the Build task. Pass task_id from meta_info and the view spec (id, name, columns, dataset_id). If view_id matches an existing view it is updated; otherwise the view is added. Use this single tool for both creating and updating views.",
)
class UpdateView:
    """Workflow to replace a view spec in the task's view_specs JSON."""

    @workflow.run
    async def run(self, workflow_input: UpdateViewInput) -> UpdateViewOutput:
        """Get current task view_specs, replace view by id, update task."""
        log.info(
            "UpdateView started",
            task_id=workflow_input.task_id,
            view_id=workflow_input.view_id,
        )
        try:
            get_result = await workflow.step(
                function="tasks_get_by_id",
                function_input={"task_id": workflow_input.task_id},
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if not get_result:
                return UpdateViewOutput(
                    success=False,
                    error="Task not found or no task returned",
                )
            task = get_result.get("task", None) if isinstance(get_result, dict) else getattr(get_result, "task", None)
            if not task:
                return UpdateViewOutput(
                    success=False,
                    error="Task not found or no task returned",
                )
            current_specs = list(
                (task.get("view_specs", None) if isinstance(task, dict) else getattr(task, "view_specs", None))
                or []
            )
            view_dict = workflow_input.view.model_dump()
            if workflow_input.view.id != workflow_input.view_id:
                view_dict["id"] = workflow_input.view_id
            updated = False
            new_specs = []
            for v in current_specs:
                if isinstance(v, dict) and v.get("id") == workflow_input.view_id:
                    new_specs.append(view_dict)
                    updated = True
                else:
                    new_specs.append(v)
            if not updated:
                new_specs.append(view_dict)
            update_result = await workflow.step(
                function="tasks_update",
                function_input={
                    "task_id": workflow_input.task_id,
                    "view_specs": new_specs,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if not update_result:
                return UpdateViewOutput(
                    success=False,
                    error="Failed to update task with view",
                )
            return UpdateViewOutput(
                success=True,
                view_id=workflow_input.view_id,
            )
        except Exception as e:
            log.error("UpdateView failed", error=str(e))
            raise NonRetryableError(
                message=f"Failed to update view: {e!s}"
            ) from e
