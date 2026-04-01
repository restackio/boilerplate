"""MCP tool to generate and store mock integration data."""

import json
from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    RetryPolicy,
    import_functions,
    log,
    workflow,
)

try:
    from apps.backend.src.functions.data_ingestion import (
        PipelineEventInput,
    )
except ImportError:
    class PipelineEventInput(BaseModel):
        """Fallback event input when backend import is unavailable."""

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


with import_functions():
    from src.functions.llm_response import (
        LlmResponseInput,
        llm_response,
    )


class MockAIIntegrationInput(BaseModel):
    """Input for prompt-based mock data generation and storage."""

    prompt: str = Field(
        ...,
        min_length=3,
        description="Natural language prompt describing the integration data to mock.",
    )
    dataset_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Target dataset name to store generated records.",
    )
    agent_id: str = Field(
        ..., description="Agent ID from meta_info."
    )
    workspace_id: str = Field(
        ..., description="Workspace ID from meta_info."
    )
    task_id: str | None = Field(
        default=None,
        description="Optional task ID from meta_info.",
    )
    record_count: int = Field(
        default=10,
        ge=1,
        le=500,
        description="Number of records to generate.",
    )
    storage_type: str = Field(
        default="clickhouse",
        description="Storage backend if dataset must be created: clickhouse or cockroachdb.",
    )
    event_name: str = Field(
        default="mock_integration",
        description="Event label used for storage and tracing.",
    )
    tags: list[str] | None = Field(
        default=None,
        description="Optional tags to attach to stored events.",
    )


class MockAIIntegrationOutput(BaseModel):
    """Output for mock data generation and ingestion."""

    success: bool
    message: str
    generated_data: list[dict[str, Any]]
    inserted_rows: int
    dataset_name: str
    integration_description: str
    storage_type: str


def _normalize_storage_type(storage_type: str) -> str:
    normalized = storage_type.strip().lower()
    if normalized not in {"clickhouse", "cockroachdb"}:
        raise NonRetryableError(
            "storage_type must be 'clickhouse' or 'cockroachdb'"
        )
    return normalized


def _parse_generation_response(
    response_text: str,
) -> tuple[list[dict[str, Any]], str]:
    try:
        payload = json.loads(response_text)
    except json.JSONDecodeError as e:
        raise NonRetryableError(
            f"Invalid JSON from LLM: {e}"
        ) from e

    if not isinstance(payload, dict):
        raise NonRetryableError(
            "LLM output must be a JSON object with records."
        )

    records = payload.get("records")
    if not isinstance(records, list):
        raise NonRetryableError(
            "LLM output must include 'records' as an array."
        )

    normalized_records: list[dict[str, Any]] = []
    for item in records:
        if isinstance(item, dict):
            normalized_records.append(item)
        else:
            normalized_records.append({"value": item})

    integration_description = str(
        payload.get("integration_description")
        or "Mock integration data generated from prompt."
    )
    return normalized_records, integration_description


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return {}


@workflow.defn(
    mcp=True,
    description="Generate realistic mock data from a free-form integration prompt and store it into a context store dataset.",
)
class MockAIIntegration:
    """Generate prompt-based mock data and ingest it into context store."""

    @workflow.run
    async def run(
        self, workflow_input: MockAIIntegrationInput
    ) -> MockAIIntegrationOutput:
        log.info(
            "MockAIIntegration started",
            dataset_name=workflow_input.dataset_name,
            workspace_id=workflow_input.workspace_id,
            record_count=workflow_input.record_count,
        )

        storage_type = _normalize_storage_type(
            workflow_input.storage_type
        )

        try:
            system_prompt = (
                "Generate realistic integration mock data as JSON. "
                "Return a JSON object with two keys: "
                '"integration_description" (string summarising the mock source) '
                'and "records" (array of objects). '
                "Each record object should have consistent field names "
                "with plausible IDs, dates, metrics, and trend patterns "
                "that fit the prompt. "
                "Every call must produce unique, randomised data — "
                "vary all names, emails, IDs, and values so that "
                "repeated calls never return the same records. "
                "Do not include anything outside the JSON."
            )
            user_prompt = (
                "Create realistic mock integration data.\n"
                f"Prompt: {workflow_input.prompt}\n"
                f"Record count: {workflow_input.record_count}\n"
                'Return a JSON object with "integration_description" and "records".'
            )

            llm_response_text = await workflow.step(
                task_queue="mcp_server",
                function=llm_response,
                function_input=LlmResponseInput(
                    create_params={
                        "model": "gpt-5.4",
                        "messages": [
                            {
                                "role": "system",
                                "content": system_prompt,
                            },
                            {
                                "role": "user",
                                "content": user_prompt,
                            },
                        ],
                        "response_format": {
                            "type": "json_object",
                        },
                        "temperature": 1.2,
                    }
                ),
                start_to_close_timeout=timedelta(seconds=120),
                retry_policy=RetryPolicy(maximum_attempts=1),
            )

            records, integration_description = (
                _parse_generation_response(llm_response_text)
            )

            if not records:
                raise NonRetryableError(
                    "Generated records are empty. Try refining the prompt."
                )

            datasets_result = await workflow.step(
                function="datasets_read",
                function_input={
                    "workspace_id": workflow_input.workspace_id
                },
                task_queue="backend",
            )
            datasets_payload = _as_dict(datasets_result)

            dataset: dict[str, Any] | None = None
            for item in datasets_payload.get("datasets", []):
                if item.get("name") == workflow_input.dataset_name:
                    dataset = item
                    break

            if dataset is None:
                create_result = await workflow.step(
                    function="datasets_create",
                    function_input={
                        "workspace_id": workflow_input.workspace_id,
                        "name": workflow_input.dataset_name,
                        "description": "Auto-created for mock integration data.",
                        "storage_type": storage_type,
                    },
                    task_queue="backend",
                    start_to_close_timeout=timedelta(seconds=30),
                )
                create_payload = _as_dict(create_result)
                dataset = create_payload.get("dataset")
                if not dataset:
                    raise NonRetryableError(
                        "Failed to auto-create dataset."
                    )

            effective_storage_type = _normalize_storage_type(
                str(dataset.get("storage_type") or storage_type)
            )
            storage_config = dataset.get("storage_config") or {}
            dataset_event_id = str(
                storage_config.get("dataset_id")
                or dataset.get("id")
                or workflow_input.dataset_name
            )

            event_tags = workflow_input.tags or [
                "mock_integration",
                workflow_input.dataset_name,
            ]

            events = [
                PipelineEventInput(
                    agent_id=workflow_input.agent_id,
                    task_id=workflow_input.task_id,
                    workspace_id=workflow_input.workspace_id,
                    dataset_id=dataset_event_id,
                    event_name=workflow_input.event_name,
                    raw_data=record,
                    transformed_data=None,
                    tags=event_tags,
                    embedding=None,
                    event_timestamp=None,
                )
                for record in records
            ]

            ingest_function = (
                "ingest_pipeline_events_cockroachdb"
                if effective_storage_type == "cockroachdb"
                else "ingest_pipeline_events"
            )

            ingest_result = await workflow.step(
                function=ingest_function,
                function_input=events,
                task_queue="backend",
            )
            ingest_payload = _as_dict(ingest_result)

            if not ingest_payload.get("success"):
                raise NonRetryableError(
                    "Ingestion failed: "
                    f"{ingest_payload.get('error', 'unknown error')}"
                )

            inserted_rows = int(
                ingest_payload.get("inserted_rows", 0)
            )
            message = (
                f"Generated {len(records)} mock records and inserted "
                f"{inserted_rows} rows into dataset "
                f"'{workflow_input.dataset_name}' ({effective_storage_type})."
            )

            log.info(
                "MockAIIntegration completed",
                dataset_name=workflow_input.dataset_name,
                inserted_rows=inserted_rows,
                storage_type=effective_storage_type,
            )

            return MockAIIntegrationOutput(
                success=True,
                message=message,
                generated_data=records,
                inserted_rows=inserted_rows,
                dataset_name=workflow_input.dataset_name,
                integration_description=integration_description,
                storage_type=effective_storage_type,
            )
        except Exception as e:
            error_message = f"MockAIIntegration failed: {e}"
            log.error(error_message)
            raise NonRetryableError(error_message) from e
