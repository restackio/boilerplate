"""MCP tool for creating or updating a file (e.g. markdown) in a dataset.

Stores file content as a single event in the dataset under a logical source path.
Other agents (or the same agent) can refer to the file by source, query the dataset
to read it, and call updatefile again to overwrite. Supports ClickHouse-backed datasets.
"""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow

# Max length for source (file path) - must match backend limit
MAX_SOURCE_LENGTH = 500


class UpdateFileInput(BaseModel):
    """Input for creating or updating a file in a dataset."""

    workspace_id: str = Field(
        ...,
        description="Workspace ID (e.g. from meta_info.workspace_id).",
    )
    dataset_id: str = Field(
        ...,
        description="Dataset UUID where the file is stored.",
    )
    source: str = Field(
        ...,
        min_length=1,
        max_length=MAX_SOURCE_LENGTH,
        description="File path or logical name (e.g. notes.md, plan.md). Used to refer to and overwrite the file.",
    )
    content: str = Field(
        ...,
        description="Full file content (e.g. markdown or plain text).",
    )
    agent_id: str = Field(
        ...,
        description="Agent ID writing the file (e.g. from meta_info.agent_id).",
    )
    task_id: str | None = Field(
        default=None,
        description="Optional task ID (e.g. from meta_info.task_id) to associate the file with a task.",
    )
    event_name: str = Field(
        default="Agent file",
        description="Event name for the stored event (default: Agent file).",
    )


class UpdateFileOutput(BaseModel):
    """Output after creating or updating a file."""

    success: bool = Field(..., description="True if the file was written")
    source: str | None = Field(default=None, description="File source path")
    error: str | None = Field(default=None, description="Error message if failed")


@workflow.defn(
    description="Create or update a file (e.g. markdown) in a dataset. Pass workspace_id, dataset_id, source (file path like notes.md), content (full text), and agent_id from meta_info. Overwrites any existing event with the same source so the same agent or others can read then update the file. Use for shared notes, plans, or state that agents can refer to and modify.",
)
class UpdateFile:
    """Workflow to write or overwrite a file in a dataset (delete by source + ingest one event)."""

    @workflow.run
    async def run(self, workflow_input: UpdateFileInput) -> UpdateFileOutput:
        """Remove existing events for this source, then ingest one event with the new content."""
        log.info(
            "UpdateFile started",
            workspace_id=workflow_input.workspace_id,
            dataset_id=workflow_input.dataset_id,
            source=workflow_input.source,
        )
        try:
            # Delete existing events for this source (no-op if none exist)
            await workflow.step(
                function="delete_dataset_events_by_source",
                function_input={
                    "workspace_id": workflow_input.workspace_id,
                    "dataset_id": workflow_input.dataset_id,
                    "source": workflow_input.source,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )

            # Ingest one event with the file content (single “chunk” = full file)
            event = {
                "agent_id": workflow_input.agent_id,
                "task_id": workflow_input.task_id,
                "workspace_id": workflow_input.workspace_id,
                "dataset_id": workflow_input.dataset_id,
                "event_name": workflow_input.event_name,
                "raw_data": {
                    "source": workflow_input.source,
                    "text": workflow_input.content,
                    "content": workflow_input.content,
                },
                "tags": ["agent_file"],
            }
            result = await workflow.step(
                function="ingest_pipeline_events",
                function_input=[event],
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )

            if result is None:
                return UpdateFileOutput(
                    success=False,
                    error="Backend returned no result from ingest",
                )
            success = getattr(result, "success", None) or (
                result.get("success") if isinstance(result, dict) else False
            )
            if not success:
                err = getattr(result, "error", None) or (
                    result.get("error") if isinstance(result, dict) else None
                ) or "Ingest failed"
                return UpdateFileOutput(success=False, error=str(err))
            return UpdateFileOutput(
                success=True,
                source=workflow_input.source,
            )
        except Exception as e:
            log.error("UpdateFile failed", error=str(e))
            raise NonRetryableError(
                message=f"Failed to update file: {e!s}"
            ) from e
