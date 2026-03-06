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
    from src.functions.datasets_crud import (
        DatasetCreateInput,
        DatasetGetByIdInput,
        DatasetGetByWorkspaceInput,
        DatasetListOutput,
        DatasetSingleOutput,
        DeleteDatasetEventsBySourceInput,
        DeleteDatasetEventsBySourceOutput,
        ListDatasetFilesInput,
        ListDatasetFilesOutput,
        QueryDatasetEventsInput,
        QueryDatasetEventsOutput,
        datasets_create,
        datasets_get_by_id,
        datasets_read,
        delete_dataset_events_by_source,
        list_dataset_files,
        query_dataset_events,
    )
    from src.functions.embed_anything_ingestion import (
        EmbedAnythingPdfInput,
        embed_anything_pdf_to_events,
    )
    from src.functions.embed_model_loader import (
        EnsureEmbedModelInput,
        ensure_embed_model_loaded,
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


@workflow.defn()
class ListDatasetFilesWorkflow:
    """List unique file sources (raw_data.source) in a dataset with chunk counts."""

    @workflow.run
    async def run(
        self, function_input: ListDatasetFilesInput
    ) -> ListDatasetFilesOutput:
        log.info("ListDatasetFilesWorkflow started")
        try:
            return await workflow.step(
                function=list_dataset_files,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=30),
                task_queue=TASK_QUEUE,
            )
        except Exception as e:
            log.error("Error during list_dataset_files: %s", e)
            raise NonRetryableError(
                message=f"Error during list_dataset_files: {e}"
            ) from e


@workflow.defn()
class DeleteDatasetEventsBySourceWorkflow:
    """Delete all events (chunks) in a dataset for a given file source."""

    @workflow.run
    async def run(
        self, function_input: DeleteDatasetEventsBySourceInput
    ) -> DeleteDatasetEventsBySourceOutput:
        log.info("DeleteDatasetEventsBySourceWorkflow started")
        try:
            return await workflow.step(
                function=delete_dataset_events_by_source,
                function_input=function_input,
                start_to_close_timeout=timedelta(seconds=60),
                task_queue=TASK_QUEUE,
            )
        except Exception as e:
            log.error(
                "Error during delete_dataset_events_by_source: %s",
                e,
            )
            raise NonRetryableError(
                message=f"Error during delete_dataset_events_by_source: {e}"
            ) from e


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
    async def run(
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

        # Ensure embed model is loaded on this worker (once per worker; later steps reuse)
        await workflow.step(
            function=ensure_embed_model_loaded,
            function_input=EnsureEmbedModelInput(),
            start_to_close_timeout=timedelta(minutes=5),
            task_queue=TASK_QUEUE,
        )

        for item in workflow_input.files_with_content:
            filename = item.get("filename") or "document"
            content_b64 = item.get("content_base64") or ""
            size_bytes = (
                len(content_b64) * 3 // 4 if content_b64 else 0
            )
            size_mb = (
                (size_bytes / (1024 * 1024)) if size_bytes else 0
            )
            log.info(
                f"[AddFilesToDataset] file={filename} size={size_bytes} ({size_mb:.2f} MB) → processing"
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
                    start_to_close_timeout=timedelta(minutes=15),
                    heartbeat_timeout=timedelta(minutes=2),
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
            # Ingest is done via ClickHouse adapter inside embed_anything_pdf_to_events
            chunks_count = getattr(
                to_events_result, "chunks_count", 0
            ) or (
                to_events_result.get("chunks_count", 0)
                if isinstance(to_events_result, dict)
                else 0
            )
            files_processed += 1
            total_chunks += chunks_count

        return AddFilesToDatasetOutput(
            success=len(errors) == 0,
            files_processed=files_processed,
            total_chunks_ingested=total_chunks,
            errors=errors or [],
        )
