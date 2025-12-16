"""MCP tool for loading data into datasets."""

import json
import re
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow

# Import PipelineEventInput to create proper objects
# Note: This creates a cross-app dependency but is necessary for proper type validation
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


def sanitize_json_string(json_str: str) -> str:
    """Attempt to sanitize common JSON formatting issues."""
    # Remove any trailing commas before closing braces/brackets
    json_str = re.sub(r",\s*([}\]])", r"\1", json_str)

    # Fix the specific satisfaction_rating issue where }] appears instead of }}
    # Pattern: "score":"excellent"}],"sharing_agreement_ids" should be "score":"excellent"}},"sharing_agreement_ids"
    json_str = re.sub(
        r'("score"\s*:\s*"[^"]*")\s*}\s*]\s*,\s*("sharing_agreement_ids")',
        r"\1}},\2",
        json_str,
    )

    # More general fix for object closing followed by array field
    # Fix common escaping issues in nested JSON
    # This is a basic sanitization - more complex cases may need custom handling
    return re.sub(
        r'}\s*]\s*,\s*"([^"]+)"\s*:\s*\[', r'}},"\1":[', json_str
    )


def safe_json_parse(
    json_str: str, record_index: int = 0
) -> dict[str, Any]:
    """Safely parse JSON with multiple fallback strategies."""
    try:
        # First attempt: direct parsing
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        try:
            # Second attempt: sanitize and parse
            sanitized = sanitize_json_string(json_str)
            log.info(
                f"Attempting to parse sanitized JSON for record {record_index}"
            )
            return json.loads(sanitized)
        except json.JSONDecodeError as sanitize_error:
            # Third attempt: handle potential extra data by finding the first complete JSON object
            try:
                # Try to find where the first JSON object ends
                decoder = json.JSONDecoder()
                obj, idx = decoder.raw_decode(sanitized)
                log.info(
                    f"Successfully parsed JSON object ending at position {idx} for record {record_index}"
                )
            except json.JSONDecodeError as decoder_error:
                # Final attempt: provide detailed error information
                error_pos = getattr(e, "pos", 0)
                context_start = max(0, error_pos - 50)
                context_end = min(len(json_str), error_pos + 50)
                error_context = json_str[
                    context_start:context_end
                ]

                # Also show what the sanitization attempted
                sanitized_context_start = max(0, error_pos - 50)
                sanitized_context_end = min(
                    len(sanitized), error_pos + 50
                )
                sanitized_context = (
                    sanitized[
                        sanitized_context_start:sanitized_context_end
                    ]
                    if "sanitized" in locals()
                    else "N/A"
                )

                error_message = (
                    f"Invalid JSON in data record {record_index}: {e}. "
                    f"Error at position {error_pos}. "
                    f"Original context: ...{error_context}... "
                    f"Sanitized context: ...{sanitized_context}... "
                    f"Sanitization error: {sanitize_error}. "
                    f"Decoder error: {decoder_error}"
                )
                raise NonRetryableError(error_message) from e
            else:
                return obj


class LoadIntoDatasetInput(BaseModel):
    """Input for loading data into a dataset."""

    input_data: list[dict[str, Any]] = Field(
        ...,
        description="Data to load as an array of objects. Example: [{'record': {...}}] or [{'record': {...}}, {'record': {...}}]",
    )
    dataset_name: str = Field(
        ..., description="Name of the dataset"
    )
    agent_id: str = Field(
        ..., description="ID of the agent loading the data"
    )
    workspace_id: str = Field(
        ..., description="ID of the workspace"
    )
    task_id: str | None = Field(
        default=None, description="ID of the task"
    )
    event_name: str = Field(
        default="Data Load", description="Event name for tracking"
    )
    tags: list[str] | None = Field(
        default=None, description="Tags for the event"
    )


class LoadIntoDatasetOutput(BaseModel):
    """Output after loading data into a dataset."""

    success: bool = Field(
        ..., description="True if data was loaded successfully"
    )
    message: str = Field(
        ..., description="Details about the operation"
    )
    inserted_rows: int = Field(
        default=0, description="Number of rows inserted"
    )
    dataset_name: str = Field(
        ...,
        description="Name of the dataset where data was loaded",
    )


@workflow.defn(description="Load data into dataset")
class LoadIntoDataset:
    """Workflow to load data into a dataset."""

    def _raise_dataset_not_found(
        self, dataset_name: str, workspace_id: str
    ) -> None:
        """Raise error when dataset is not found."""
        error_message = (
            f"Dataset '{dataset_name}' does not exist in workspace "
            f"{workspace_id}. Please create the dataset first before loading data into it."
        )
        raise NonRetryableError(error_message)

    def _raise_ingestion_failed(self, error_details: str) -> None:
        """Raise error when data ingestion fails."""
        error_message = f"Failed to ingest data: {error_details}"
        raise NonRetryableError(error_message)

    @workflow.run
    async def run(
        self, workflow_input: LoadIntoDatasetInput
    ) -> LoadIntoDatasetOutput:
        """Load data into dataset."""
        log.info("LoadIntoDataset started", input=workflow_input)

        try:
            # Process the data - ensure all records are dictionaries
            processed_data = []
            for i, record in enumerate(workflow_input.input_data):
                # Ensure record is a dictionary
                if isinstance(record, str):
                    parsed_record = safe_json_parse(record, i)
                    processed_data.append(parsed_record)
                else:
                    processed_data.append(record)

            # Check if dataset exists, create if it doesn't

            # Get existing datasets to check if our dataset exists
            datasets_result = await workflow.step(
                function="datasets_read",
                function_input={
                    "workspace_id": workflow_input.workspace_id
                },
                task_queue="backend",
            )

            # Resolve dataset name to dataset ID
            dataset_id = None
            for dataset in datasets_result["datasets"]:
                if dataset["name"] == workflow_input.dataset_name:
                    dataset_id = dataset["id"]
                    break

            # Fail if dataset doesn't exist - datasets should be created separately
            if not dataset_id:
                self._raise_dataset_not_found(
                    workflow_input.dataset_name,
                    workflow_input.workspace_id,
                )

            # Prepare events for ClickHouse ingestion
            # Create proper PipelineEventInput objects
            events = []
            for record in processed_data:
                event = PipelineEventInput(
                    agent_id=workflow_input.agent_id,
                    task_id=workflow_input.task_id,
                    workspace_id=workflow_input.workspace_id,
                    dataset_id=dataset_id,  # Use resolved dataset ID (UUID) instead of name
                    event_name=workflow_input.event_name,
                    raw_data=record,  # Store the entire record as raw_data
                    transformed_data=None,  # Optional processed data
                    tags=workflow_input.tags
                    or [
                        workflow_input.event_name,
                        workflow_input.dataset_name,
                    ],
                    embedding=None,  # Optional vector embedding
                    event_timestamp=None,  # Will be set automatically by ingest_pipeline_events function
                )
                events.append(event)

            # Actually ingest the data into ClickHouse
            log.info(
                f"Ingesting {len(events)} events into ClickHouse"
            )

            # Log detailed information about the events being sent
            log.info(
                f"Event details: agent_id={workflow_input.agent_id}, workspace_id={workflow_input.workspace_id}, dataset_name={workflow_input.dataset_name}"
            )
            log.info(
                f"First event sample: {events[0].model_dump() if events else 'No events'}"
            )

            try:
                ingest_result = await workflow.step(
                    function="ingest_pipeline_events",
                    function_input=events,
                    task_queue="backend",
                )
            except Exception as step_error:
                error_message = f"Workflow step failed: {type(step_error).__name__}: {step_error}"
                log.error(f"Detailed step error: {error_message}")
                log.error(
                    f"Step error args: {getattr(step_error, 'args', 'No args')}"
                )
                raise NonRetryableError(
                    error_message
                ) from step_error

            if not ingest_result.get("success"):
                error_details = ingest_result.get(
                    "error", "Unknown error"
                )
                log.error(
                    f"Ingestion failed with details: {ingest_result}"
                )
                self._raise_ingestion_failed(error_details)

            output = LoadIntoDatasetOutput(
                success=True,
                message=f"Successfully loaded {ingest_result.get('inserted_rows', 0)} rows into dataset '{workflow_input.dataset_name}'",
                inserted_rows=ingest_result.get(
                    "inserted_rows", 0
                ),
                dataset_name=workflow_input.dataset_name,
            )

            log.info(
                "LoadIntoDataset completed successfully",
                dataset=output.dataset_name,
                rows=output.inserted_rows,
                clickhouse_table=ingest_result.get(
                    "table_name", "unknown"
                ),
            )

        except Exception as e:
            error_message = f"LoadIntoDataset failed: {e}"
            log.error(error_message)
            raise NonRetryableError(error_message) from e

        return output
