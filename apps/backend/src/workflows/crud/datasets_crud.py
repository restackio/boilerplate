from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.data_ingestion import (
        ingest_pipeline_events,
    )
    from src.functions.datasets_crud import (
        DatasetCreateInput,
        DatasetGetByIdInput,
        DatasetGetByWorkspaceInput,
        DatasetListOutput,
        DatasetSingleOutput,
        QueryDatasetEventsInput,
        QueryDatasetEventsOutput,
        datasets_create,
        datasets_get_by_id,
        datasets_read,
        query_dataset_events,
    )
    from src.functions.embed_anything_ingestion import (
        EmbedAnythingPdfInput,
        embed_anything_pdf_to_events,
    )


@workflow.defn()
class DatasetsReadWorkflow:
    @workflow.run
    async def run(
        self, function_input: DatasetGetByWorkspaceInput
    ) -> DatasetListOutput:
        log.info("DatasetsReadWorkflow started")
        log.info(f"DatasetsReadWorkflow input: {function_input}")
        try:
            result = await workflow.step(
                function=datasets_read,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=30),
                task_queue=TASK_QUEUE,
            )
            log.info(f"DatasetsReadWorkflow result: {result}")
        except Exception as e:
            error_message = f"Error during datasets_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return result


@workflow.defn()
class DatasetsGetByIdWorkflow:
    @workflow.run
    async def run(
        self, function_input: DatasetGetByIdInput
    ) -> DatasetSingleOutput:
        log.info("DatasetsGetByIdWorkflow started")
        log.info(
            f"DatasetsGetByIdWorkflow input: {function_input}"
        )
        try:
            result = await workflow.step(
                function=datasets_get_by_id,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=30),
                task_queue=TASK_QUEUE,
            )
            log.info(f"DatasetsGetByIdWorkflow result: {result}")
        except Exception as e:
            error_message = (
                f"Error during datasets_get_by_id: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return result


@workflow.defn()
class DatasetsCreateWorkflow:
    @workflow.run
    async def run(
        self, function_input: DatasetCreateInput
    ) -> DatasetSingleOutput:
        log.info("DatasetsCreateWorkflow started")
        log.info(
            f"DatasetsCreateWorkflow input: {function_input}"
        )
        try:
            result = await workflow.step(
                function=datasets_create,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=30),
                task_queue=TASK_QUEUE,
            )
            log.info(f"DatasetsCreateWorkflow result: {result}")
        except Exception as e:
            error_message = f"Error during datasets_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return result


@workflow.defn()
class QueryDatasetEventsWorkflow:
    @workflow.run
    async def run(
        self, function_input: QueryDatasetEventsInput
    ) -> QueryDatasetEventsOutput:
        log.info("QueryDatasetEventsWorkflow started")
        log.info(
            f"QueryDatasetEventsWorkflow input: {function_input}"
        )

        try:
            step_result = await workflow.step(
                function=query_dataset_events,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=60),
                task_queue=TASK_QUEUE,
            )

            log.info(
                "QueryDatasetEventsWorkflow completed successfully"
            )
            # Return the step result directly
        except Exception as e:
            error_message = (
                f"Error during query_dataset_events: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return step_result


# --- Seed dataset from PDFs (EmbedAnything: one workflow, no API key) ---



class AddFilesToDatasetInput(BaseModel):
    """Input for adding files to a dataset. Files as base64; EmbedAnything does extract+embed."""

    workspace_id: str = Field(..., min_length=1)
    dataset_id: str = Field(
        ...,
        min_length=1,
        description="Dataset UUID; events are stored with this id for scoped queries.",
    )
    task_id: str | None = None
    files_with_content: list[dict[str, Any]] = Field(
        ...,
        description="List of { filename: string, content_base64: string }",
    )


class AddFilesToDatasetOutput(BaseModel):
    """Result of adding files to a dataset."""

    success: bool
    files_processed: int = 0
    total_chunks_ingested: int = 0
    errors: list[str] = Field(default_factory=list)


@workflow.defn(
    description="Add files to a dataset: EmbedAnything does extract, chunk, embed; then save to ClickHouse. Supports PDF, text, images. One workflow, local, no API key."
)
class AddFilesToDatasetWorkflow:
    """Files → extract/chunk/embed (EmbedAnything) → ingest into ClickHouse."""

    @workflow.run
    async def run(  # noqa: C901
        self, workflow_input: AddFilesToDatasetInput
    ) -> AddFilesToDatasetOutput:
        errors: list[str] = []
        total_chunks = 0
        files_processed = 0

        if not workflow_input.files_with_content:
            raise NonRetryableError(
                message="files_with_content is required (list of { filename, content_base64 })."
            )

        log.info(
            f"AddFilesToDatasetWorkflow started: dataset_id={workflow_input.dataset_id}, files={len(workflow_input.files_with_content)}"
        )

        # Ensure dataset exists (by id)
        get_result = await workflow.step(
            function=datasets_get_by_id,
            function_input=DatasetGetByIdInput(
                dataset_id=workflow_input.dataset_id,
                workspace_id=workflow_input.workspace_id,
            ),
            start_to_close_timeout=timedelta(seconds=30),
            task_queue=TASK_QUEUE,
        )
        if not getattr(get_result, "dataset", None) and (
            not isinstance(get_result, dict)
            or not get_result.get("dataset")
        ):
            raise NonRetryableError(
                message=f"Dataset '{workflow_input.dataset_id}' not found in workspace. Create it first."
            )

        for item in workflow_input.files_with_content:
            filename = item.get("filename") or "document.pdf"
            content_b64 = item.get("content_base64")
            if not content_b64:
                errors.append(
                    f"{filename}: missing content_base64"
                )
                continue
            # One step: file → events (extract + chunk + embed via EmbedAnything)
            try:
                to_events_result = await workflow.step(
                    function=embed_anything_pdf_to_events,
                    function_input=EmbedAnythingPdfInput(
                        filename=filename,
                        content_base64=content_b64,
                        workspace_id=workflow_input.workspace_id,
                        dataset_id=workflow_input.dataset_id,
                        task_id=workflow_input.task_id,
                        event_name="PDF Chunk",
                        tags=["pdf", "embed_anything"],
                    ),
                    start_to_close_timeout=timedelta(seconds=300),
                    task_queue=TASK_QUEUE,
                )
            except Exception as e:  # noqa: BLE001
                errors.append(f"{filename}: {e}")
                continue
            to_err = getattr(to_events_result, "error", None) or (
                to_events_result.get("error")
                if isinstance(to_events_result, dict)
                else None
            )
            if to_err:
                errors.append(f"{filename}: {to_err}")
                continue
            events = (
                getattr(to_events_result, "events", None)
                or (
                    to_events_result.get("events")
                    if isinstance(to_events_result, dict)
                    else []
                )
                or []
            )
            if not events:
                continue
            try:
                ingest_result = await workflow.step(
                    function=ingest_pipeline_events,
                    function_input=events,
                    start_to_close_timeout=timedelta(seconds=120),
                    task_queue=TASK_QUEUE,
                )
            except Exception as e:  # noqa: BLE001
                errors.append(f"{filename} ingest: {e}")
                continue
            ingest_ok = getattr(ingest_result, "success", None)
            if ingest_ok is None and isinstance(
                ingest_result, dict
            ):
                ingest_ok = ingest_result.get("success")
            if ingest_ok:
                files_processed += 1
                total_chunks += getattr(
                    ingest_result, "inserted_rows", None
                ) or (
                    ingest_result.get("inserted_rows", 0)
                    if isinstance(ingest_result, dict)
                    else 0
                )
            else:
                err_msg = getattr(
                    ingest_result, "error", None
                ) or (
                    ingest_result.get("error", "ingest failed")
                    if isinstance(ingest_result, dict)
                    else "ingest failed"
                )
                errors.append(f"{filename}: {err_msg}")

        return AddFilesToDatasetOutput(
            success=len(errors) == 0,
            files_processed=files_processed,
            total_chunks_ingested=total_chunks,
            errors=errors if errors else [],
        )
