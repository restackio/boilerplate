"""MCP tool for creating a view on the current Build task (saves view spec in task.view_specs)."""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow


class ViewColumnSpec(BaseModel):
    """Column definition for a view."""

    key: str = Field(..., description="Field key in the data")
    label: str = Field(..., description="Display label for the column")


class ViewSpec(BaseModel):
    """Single view definition stored in task.view_specs."""

    id: str = Field(..., description="Unique view id (e.g. view-tech-companies)")
    name: str = Field(..., description="Display name (e.g. Tech companies)")
    columns: list[ViewColumnSpec] = Field(
        default_factory=list,
        description="Columns to show: [{key, label}, ...]",
    )
    dataset_id: str = Field(
        ...,
        description="Dataset UUID that backs this view (from CreateDataset or existing)",
    )
    entity_id_field: str | None = Field(
        default=None,
        description="Field in row data that identifies the entity for row timeline (e.g. id, company_id)",
    )
    activity_filter: dict | None = Field(
        default=None,
        description="Optional filter for row timeline events (e.g. event_name, tags)",
    )


class CreateViewInput(BaseModel):
    """Input for creating a view on the Build task."""

    task_id: str = Field(
        ...,
        description="Build task ID (from meta_info.task_id)",
    )
    view: ViewSpec = Field(
        ...,
        description="View spec: id, name, columns, dataset_id, optional entity_id_field and activity_filter",
    )


class CreateViewOutput(BaseModel):
    """Output after creating a view."""

    success: bool = Field(..., description="True if view was added to task")
    view_id: str | None = Field(default=None, description="Id of the view")
    error: str | None = Field(default=None, description="Error message if failed")


@workflow.defn(
    description="Add a view to the current Build task. Use after creating a dataset when the user wants a table with specific columns. Pass task_id from meta_info and a view spec (id, name, columns [{key, label}], dataset_id). Optionally entity_id_field and activity_filter for row timeline.",
)
class CreateView:
    """Workflow to add a view spec to the task's view_specs JSON."""

    @workflow.run
    async def run(self, workflow_input: CreateViewInput) -> CreateViewOutput:
        """Get current task view_specs, append the new view, update task."""
        log.info(
            "CreateView started",
            task_id=workflow_input.task_id,
            view_id=workflow_input.view.id,
        )
        try:
            get_result = await workflow.step(
                function="tasks_get_by_id",
                function_input={"task_id": workflow_input.task_id},
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if not get_result:
                return CreateViewOutput(
                    success=False,
                    error="Task not found or no task returned",
                )
            task = get_result.get("task", None) if isinstance(get_result, dict) else getattr(get_result, "task", None)
            if not task:
                return CreateViewOutput(
                    success=False,
                    error="Task not found or no task returned",
                )
            current_specs = list(
                (task.get("view_specs", None) if isinstance(task, dict) else getattr(task, "view_specs", None))
                or []
            )
            view_dict = workflow_input.view.model_dump()
            current_specs.append(view_dict)
            update_result = await workflow.step(
                function="tasks_update",
                function_input={
                    "task_id": workflow_input.task_id,
                    "view_specs": current_specs,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if not update_result:
                return CreateViewOutput(
                    success=False,
                    error="Failed to update task with view",
                )
            return CreateViewOutput(
                success=True,
                view_id=workflow_input.view.id,
            )
        except Exception as e:
            log.error("CreateView failed", error=str(e))
            raise NonRetryableError(
                message=f"Failed to create view: {e!s}"
            ) from e
