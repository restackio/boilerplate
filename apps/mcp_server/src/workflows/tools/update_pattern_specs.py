"""MCP tool for updating the Build task's pattern_specs (agent design pattern for React Flow)."""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow


class UpdatePatternSpecsInput(BaseModel):
    """Input for updating pattern_specs on the Build task."""

    task_id: str = Field(
        ...,
        description="Build task ID (from meta_info.task_id)",
    )
    workspace_id: str | None = Field(
        default=None,
        description="Workspace ID (from meta_info.workspace_id); required for update.",
    )
    pattern_specs: dict = Field(
        ...,
        description="Full pattern spec: { title?, nodes: [{ id, type, position, data: { label, entityType?, entityId?, href?, ... } }], edges: [{ id, source, target, ... }] }. Replaces existing pattern_specs.",
    )


class UpdatePatternSpecsOutput(BaseModel):
    """Output after updating pattern_specs."""

    success: bool = Field(
        ..., description="True if pattern_specs was updated"
    )
    error: str | None = Field(default=None)


@workflow.defn(
    mcp=True,
    description="Update the Build task's pattern_specs (agent design pattern). Call this when you create or update agents, datasets, views, or integrations so the diagram and Created list stay in sync. Pass task_id, workspace_id from meta_info, and the full pattern_specs object with nodes (use entityType: 'agent'|'dataset'|'view'|'integration', entityId, href for linkable entities) and edges.",
)
class UpdatePatternSpecs:
    """Workflow to set the task's pattern_specs JSON (powers React Flow and Created list)."""

    @workflow.run
    async def run(
        self, workflow_input: UpdatePatternSpecsInput
    ) -> UpdatePatternSpecsOutput:
        """Update task.pattern_specs via tasks_update."""
        log.info(
            "UpdatePatternSpecs started",
            task_id=workflow_input.task_id,
        )
        try:
            payload = {
                "task_id": workflow_input.task_id,
                "pattern_specs": workflow_input.pattern_specs,
            }
            if workflow_input.workspace_id:
                payload["workspace_id"] = (
                    workflow_input.workspace_id
                )
            update_result = await workflow.step(
                function="tasks_update",
                function_input=payload,
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if not update_result:
                return UpdatePatternSpecsOutput(
                    success=False,
                    error="tasks_update returned no result",
                )
            result_task = (
                update_result.get("task")
                if isinstance(update_result, dict)
                else getattr(update_result, "task", None)
            )
            if not result_task:
                return UpdatePatternSpecsOutput(
                    success=False,
                    error="Task not returned from update",
                )
            return UpdatePatternSpecsOutput(success=True)
        except Exception as e:
            log.error("UpdatePatternSpecs failed", error=str(e))
            raise NonRetryableError(
                message=f"Failed to update pattern_specs: {e!s}"
            ) from e
