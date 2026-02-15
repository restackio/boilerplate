"""MCP tool for adding/updating a column in an existing dataset row."""

from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

# Import PipelineEventInput to create proper objects
try:
    from apps.backend.src.functions.data_ingestion import (
        PipelineEventInput,
    )
except ImportError:
    # Fallback: Define a local version if import fails
    class PipelineEventInput(BaseModel):
        agent_id: str = Field(..., min_length=1)
        task_id: str | None = None
        workspace_id: str = Field(..., min_length=1)
        dataset_id: str | None = None
        event_name: str = Field(..., min_length=1)
        raw_data: dict[str, Any] = Field(default_factory=dict)
        transformed_data: dict[str, Any] | None = None
        tags: list[str] | None = None
        embedding: list[float] | None = None
        event_timestamp: str | None = None


class UpdateDatasetInput(BaseModel):
    """Input for adding/updating a column in a dataset row."""

    row_id: str = Field(
        ...,
        description="ID of the row to update (from the context_row event)",
    )
    column_name: str = Field(
        ...,
        description="Name of the column to add/update",
    )
    value: Any = Field(
        ...,
        description="Value to store in the column (can be any JSON-serializable type)",
    )
    dataset_name: str = Field(
        ..., description="Name of the dataset"
    )
    agent_id: str = Field(
        ..., description="ID of the agent updating the data"
    )
    workspace_id: str | None = Field(
        default=None, description="ID of the workspace (will be fetched from task if not provided)"
    )
    task_id: str | None = Field(
        default=None, description="ID of the task"
    )
    run_id: str | None = Field(
        default=None, description="Optional run ID for tracking enrichment runs"
    )


class UpdateDatasetOutput(BaseModel):
    """Output after updating a dataset column."""

    success: bool = Field(
        ..., description="True if column was added successfully"
    )
    message: str = Field(
        ..., description="Details about the operation"
    )
    row_id: str = Field(
        ..., description="ID of the row that was updated"
    )
    column_name: str = Field(
        ..., description="Name of the column that was added"
    )


@workflow.defn(description="Add or update a column in an existing dataset row")
class UpdateDataset:
    """Workflow to add/update a column in an existing dataset row.

    This tool is specifically for enrichment - it adds a new column to an existing row
    by creating an enrichment_result event that gets merged with the context_row.
    """

    def _raise_dataset_not_found(
        self, dataset_name: str, workspace_id: str
    ) -> None:
        """Raise error when dataset is not found."""
        error_message = (
            f"Dataset '{dataset_name}' does not exist in workspace "
            f"{workspace_id}. Please create the dataset first."
        )
        raise NonRetryableError(error_message)

    @workflow.run
    async def run(
        self, workflow_input: UpdateDatasetInput
    ) -> UpdateDatasetOutput:
        """Add/update a column in a dataset row."""
        log.info(
            "UpdateDataset started",
            row_id=workflow_input.row_id,
            column_name=workflow_input.column_name,
            dataset_name=workflow_input.dataset_name,
        )

        try:
            # Resolve workspace_id if not provided (fetch from task)
            workspace_id = workflow_input.workspace_id
            if not workspace_id and workflow_input.task_id:
                log.info(f"Fetching workspace_id from task {workflow_input.task_id}")
                try:
                    task_result = await workflow.step(
                        function="tasks_get_by_id",
                        function_input={"task_id": workflow_input.task_id},
                        task_queue="backend",  # Backend functions run on backend task queue
                    )
                    if task_result and task_result.get("task"):
                        workspace_id = task_result["task"].get("workspace_id")
                        log.info(f"Resolved workspace_id: {workspace_id}")
                except Exception as e:
                    log.warning(f"Failed to fetch workspace_id from task: {e}")
            
            if not workspace_id:
                raise NonRetryableError(
                    "workspace_id is required. Either provide it directly or ensure task_id is provided."
                )
            
            # Resolve dataset name to dataset ID
            datasets_result = await workflow.step(
                function="datasets_read",
                function_input={"workspace_id": workspace_id},
                task_queue="backend",  # Backend functions run on backend task queue
            )

            dataset_id = None
            for dataset in datasets_result["datasets"]:
                if dataset["name"] == workflow_input.dataset_name:
                    dataset_id = dataset["id"]
                    break

            if not dataset_id:
                self._raise_dataset_not_found(
                    workflow_input.dataset_name,
                    workspace_id,
                )

            # Create enrichment_result event with column_name and value
            # This will be merged with the context_row on the frontend
            event = PipelineEventInput(
                agent_id=workflow_input.agent_id,
                task_id=workflow_input.task_id,
                workspace_id=workspace_id,
                dataset_id=dataset_id,
                event_name="enrichment_result",
                raw_data={
                    "row_id": workflow_input.row_id,
                    "column_name": workflow_input.column_name,
                    "value": workflow_input.value,
                    **(
                        {"run_id": workflow_input.run_id}
                        if workflow_input.run_id
                        else {}
                    ),
                },
                transformed_data=None,
                tags=[
                    "enrichment",
                    workflow_input.column_name,
                    *(
                        [workflow_input.run_id]
                        if workflow_input.run_id
                        else []
                    ),
                ],
                embedding=None,
                event_timestamp=None,
            )

            # Ingest the enrichment result
            log.info(
                f"Adding column '{workflow_input.column_name}' to row {workflow_input.row_id}"
            )

            ingest_result = await workflow.step(
                function="ingest_pipeline_events",
                function_input=[event],
                task_queue="backend",  # Backend functions run on backend task queue
            )

            if not ingest_result.get("success"):
                error_details = ingest_result.get("error", "Unknown error")
                log.error(f"Failed to add column: {error_details}")
                raise NonRetryableError(
                    f"Failed to add column: {error_details}"
                )

            output = UpdateDatasetOutput(
                success=True,
                message=f"Successfully added column '{workflow_input.column_name}' to row {workflow_input.row_id}",
                row_id=workflow_input.row_id,
                column_name=workflow_input.column_name,
            )

            log.info(
                "UpdateDataset completed successfully",
                row_id=output.row_id,
                column_name=output.column_name,
            )

            return output

        except Exception as e:
            error_message = f"UpdateDataset failed: {e}"
            log.error(error_message)
            raise NonRetryableError(error_message) from e

