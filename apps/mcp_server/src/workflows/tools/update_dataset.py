"""MCP tool for creating or updating a dataset.

Single tool: create if dataset_id is omitted; update if dataset_id is provided and exists.
"""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow


class UpdateDatasetInput(BaseModel):
    """Input for creating or updating a dataset."""

    dataset_id: str | None = Field(
        default=None,
        description="ID of the dataset to update. Omit to create a new dataset.",
    )
    workspace_id: str = Field(
        ...,
        description="Workspace ID (required for create and to scope update).",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Dataset name (slug: lowercase letters, numbers, hyphens, underscores).",
    )
    description: str | None = Field(
        default=None, description="Optional description."
    )
    storage_type: str = Field(
        default="clickhouse",
        description="Storage backend; use clickhouse for pipeline events.",
    )


class UpdateDatasetOutput(BaseModel):
    """Output after creating or updating a dataset."""

    success: bool = Field(
        ..., description="True if dataset was created or updated"
    )
    dataset_id: str | None = Field(
        default=None, description="ID of the dataset"
    )
    name: str | None = Field(
        default=None, description="Name of the dataset"
    )
    created: bool = Field(
        default=False,
        description="True if a new dataset was created",
    )
    error: str | None = Field(
        default=None, description="Error message if failed"
    )


@workflow.defn(
    mcp=True,
    description="Create or update a dataset (table). Omit dataset_id to create; pass dataset_id to update name/description (e.g. after user feedback). Pass workspace_id from meta_info, name as slug, optional description.",
)
class UpdateDataset:
    """Workflow to create or update a dataset via the backend."""

    @workflow.run
    async def run(
        self, workflow_input: UpdateDatasetInput
    ) -> UpdateDatasetOutput:
        """Create dataset if no dataset_id; otherwise update existing dataset."""
        dataset_id = (workflow_input.dataset_id or "").strip()
        do_update = bool(dataset_id)
        log.info(
            "UpdateDataset started",
            workspace_id=workflow_input.workspace_id,
            name=workflow_input.name,
            do_update=do_update,
        )
        try:
            if do_update:
                result = await workflow.step(
                    function="datasets_update",
                    function_input={
                        "dataset_id": dataset_id,
                        "workspace_id": workflow_input.workspace_id,
                        "name": workflow_input.name,
                        "description": workflow_input.description,
                    },
                    task_queue="backend",
                    start_to_close_timeout=timedelta(seconds=30),
                )
                if result and (
                    getattr(result, "dataset", None)
                    or (
                        isinstance(result, dict)
                        and result.get("dataset")
                    )
                ):
                    dataset = getattr(
                        result, "dataset", None
                    ) or result.get("dataset")
                    did = getattr(dataset, "id", None) or (
                        dataset.get("id")
                        if isinstance(dataset, dict)
                        else None
                    )
                    dname = getattr(dataset, "name", None) or (
                        dataset.get("name")
                        if isinstance(dataset, dict)
                        else None
                    )
                    return UpdateDatasetOutput(
                        success=True,
                        dataset_id=str(did)
                        if did
                        else dataset_id,
                        name=dname,
                        created=False,
                    )
                err = (
                    getattr(result, "error", None)
                    or (
                        result.get("error")
                        if isinstance(result, dict)
                        else None
                    )
                    or "Update failed"
                )
                return UpdateDatasetOutput(
                    success=False, error=str(err)
                )
            # Create (idempotent by workspace_id + name)
            result = await workflow.step(
                function="datasets_create",
                function_input={
                    "workspace_id": workflow_input.workspace_id,
                    "name": workflow_input.name,
                    "description": workflow_input.description,
                    "storage_type": workflow_input.storage_type,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if (
                result
                and isinstance(result, dict)
                and result.get("dataset")
            ):
                dataset = result["dataset"]
                return UpdateDatasetOutput(
                    success=True,
                    dataset_id=dataset.get("id"),
                    name=dataset.get("name"),
                    created=True,
                )
            if getattr(result, "dataset", None):
                dataset = result.dataset
                return UpdateDatasetOutput(
                    success=True,
                    dataset_id=getattr(dataset, "id", None),
                    name=getattr(dataset, "name", None),
                    created=True,
                )
            if result and isinstance(result, dict):
                return UpdateDatasetOutput(
                    success=False,
                    error=result.get(
                        "error", "Unknown error from backend"
                    ),
                )
            return UpdateDatasetOutput(
                success=False, error="Backend returned no dataset"
            )
        except Exception as e:
            log.error("UpdateDataset failed", error=str(e))
            raise NonRetryableError(
                message=f"Failed to create/update dataset: {e!s}"
            ) from e
