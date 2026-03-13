"""MCP tool for creating a dataset in the workspace."""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow


class CreateDatasetInput(BaseModel):
    """Input for creating a dataset."""

    workspace_id: str = Field(
        ...,
        description="Workspace ID where the dataset will be created",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Dataset name (slug: lowercase letters, numbers, hyphens, underscores). Example: tech-companies",
    )
    description: str | None = Field(
        default=None,
        description="Optional description of the dataset",
    )
    storage_type: str = Field(
        default="clickhouse",
        description="Storage backend; use clickhouse for pipeline events",
    )


class CreateDatasetOutput(BaseModel):
    """Output after creating a dataset."""

    success: bool = Field(..., description="True if dataset was created")
    dataset_id: str | None = Field(
        default=None,
        description="ID of the created dataset",
    )
    name: str | None = Field(default=None, description="Name of the dataset")
    error: str | None = Field(default=None, description="Error message if failed")


@workflow.defn(
    description="Create a dataset in the workspace. Use when the user wants a table or list of entities (e.g. companies, people).",
)
class CreateDataset:
    """Workflow to create a dataset via the backend."""

    @workflow.run
    async def run(
        self, workflow_input: CreateDatasetInput
    ) -> CreateDatasetOutput:
        """Create a dataset by calling the backend datasets_create function."""
        log.info(
            "CreateDataset started",
            workspace_id=workflow_input.workspace_id,
            name=workflow_input.name,
        )
        try:
            function_input = {
                "workspace_id": workflow_input.workspace_id,
                "name": workflow_input.name,
                "description": workflow_input.description,
                "storage_type": workflow_input.storage_type,
            }
            result = await workflow.step(
                function="datasets_create",
                function_input=function_input,
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if result and isinstance(result, dict) and result.get("dataset"):
                dataset = result["dataset"]
                return CreateDatasetOutput(
                    success=True,
                    dataset_id=dataset.get("id"),
                    name=dataset.get("name"),
                )
            if result and isinstance(result, dict):
                return CreateDatasetOutput(
                    success=False,
                    error=result.get("error", "Unknown error from backend"),
                )
            return CreateDatasetOutput(
                success=False,
                error="Backend returned no dataset",
            )
        except Exception as e:
            log.error("CreateDataset failed", error=str(e))
            raise NonRetryableError(
                message=f"Failed to create dataset: {e!s}"
            ) from e
