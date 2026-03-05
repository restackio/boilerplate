"""PDF → extract (OCR), chunk, embed → pipeline events using EmbedAnything.

Single activity: receives PDF base64; EmbedAnything does extract/OCR, chunking, and
embeddings; returns events (metadata + embedding) for ClickHouse. No OpenAI, no API key.
PDF splitting for the 4 MB gRPC limit is done in the frontend; each payload is one part.
See https://github.com/StarlightSearch/EmbedAnything
"""

import base64
import contextlib
import tempfile
from pathlib import Path
from typing import Any

import anyio
from pydantic import BaseModel, Field
from restack_ai.function import function, heartbeat, log

from src.functions.data_ingestion import PipelineEventInput

# Lazy-loaded EmbedAnything model (text chunking only)
_embed_model: Any = None
_embed_config: Any = None

# Default: small HF model, no GPU required
DEFAULT_MODEL_ID = "sentence-transformers/all-MiniLM-L12-v2"

# Tuned for large PDFs (e.g. 3.5MB): fewer chunks, bigger batches, streaming buffer
CHUNK_SIZE = 1200
BATCH_SIZE = 128
BUFFER_SIZE = 64

# Throttle heartbeat for large doc (every N chunks) to reduce overhead
HEARTBEAT_EVERY_N_CHUNKS = 50
# Send heartbeat every N seconds during long-running embed_file (activity heartbeat_timeout is 2 min)
HEARTBEAT_INTERVAL_SECONDS = 45

# Sentinel UUID when ingestion is dataset-only (no agent context)
DATASET_ONLY_AGENT_ID = "00000000-0000-0000-0000-000000000000"

_IMPORT_ERR_MSG = (
    "embed-anything not installed. pip install embed-anything"
)


def _get_embed_model_and_config() -> tuple[Any, Any]:
    """Lazy-load EmbedAnything HuggingFace model and config (text chunking)."""
    global _embed_model, _embed_config  # noqa: PLW0603
    if _embed_model is not None:
        return _embed_model, _embed_config
    try:
        from embed_anything import EmbeddingModel, TextEmbedConfig
    except ImportError as e:
        raise ImportError(_IMPORT_ERR_MSG) from e
    log.info(
        f"embed_anything: loading HuggingFace model {DEFAULT_MODEL_ID}"
    )
    _embed_model = EmbeddingModel.from_pretrained_hf(
        model_id=DEFAULT_MODEL_ID
    )
    log.info("embed_anything: model loaded")
    _embed_config = TextEmbedConfig(
        chunk_size=CHUNK_SIZE,
        batch_size=BATCH_SIZE,
        buffer_size=BUFFER_SIZE,
        splitting_strategy="sentence",
    )
    return _embed_model, _embed_config


class EmbedAnythingPdfInput(BaseModel):
    """Input: one PDF as base64 + pipeline context."""

    filename: str = Field(
        ..., description="Original filename (e.g. document.pdf)"
    )
    content_base64: str = Field(
        ..., description="PDF content as base64"
    )
    agent_id: str | None = Field(
        default=None,
        description="Agent UUID; omit for dataset-only ingestion (uses sentinel).",
    )
    workspace_id: str = Field(..., min_length=1)
    dataset_id: str = Field(
        ..., description="Dataset name for events"
    )
    task_id: str | None = None
    event_name: str = Field(
        default="PDF Chunk", description="Event name"
    )
    tags: list[str] | None = Field(
        default_factory=lambda: ["pdf", "embed_anything"]
    )


def _chunk_embed_data_to_events(
    data: list,
    input_data: EmbedAnythingPdfInput,
) -> list[dict[str, Any]]:
    """Map EmbedData list (from embed_file text chunking) to pipeline events."""
    events = []
    total = len(data)
    if total == 0:
        log.warning(
            "embed_anything: embed_file returned 0 chunks"
        )
    for i, item in enumerate(data):
        if i % HEARTBEAT_EVERY_N_CHUNKS == 0 or i == total - 1:
            log.info(
                f"embed_anything: processing chunk {i + 1}/{total}"
            )
            heartbeat(
                f"embed_anything: processing chunk {i + 1}/{total}"
            )
        text = getattr(item, "text", "") or ""
        emb = getattr(item, "embedding", None)
        meta = getattr(item, "metadata", None) or {}
        if not isinstance(meta, dict):
            meta = {} if meta is None else {"value": str(meta)}
        if not isinstance(emb, list):
            try:
                emb = list(emb) if emb is not None else []
            except (TypeError, ValueError):
                emb = []
        event = PipelineEventInput(
            agent_id=input_data.agent_id or DATASET_ONLY_AGENT_ID,
            task_id=input_data.task_id,
            workspace_id=input_data.workspace_id,
            dataset_id=input_data.dataset_id,
            event_name=input_data.event_name,
            raw_data={
                "text": text,
                "source": input_data.filename,
                "chunk_index": i,
                "metadata": meta,
            },
            transformed_data=None,
            tags=(input_data.tags or []) + [f"chunk_{i}"],
            embedding=emb or None,
            event_timestamp=None,
        )
        events.append(event.model_dump())
    return events


class EmbedAnythingPdfOutput(BaseModel):
    """Output: pipeline events (raw_data + embedding) ready for ingest."""

    events: list[dict[str, Any]] = Field(default_factory=list)
    chunks_count: int = 0
    error: str | None = None


@function.defn()
async def embed_anything_pdf_to_events(
    input_data: EmbedAnythingPdfInput,
) -> EmbedAnythingPdfOutput:
    """PDF → extract, chunk, embed in one step (EmbedAnything); return pipeline events.

    No OpenAI, no NeMo: local model. Writes temp file, runs embed_file, maps to
    PipelineEventInput and returns event dicts for ingest_pipeline_events.
    """
    log.info(
        f"embed_anything: start filename={input_data.filename}"
    )
    try:
        content = base64.b64decode(
            input_data.content_base64, validate=True
        )
    except (ValueError, TypeError) as e:
        log.error(
            f"embed_anything: invalid base64 filename={input_data.filename} error={e}"
        )
        return EmbedAnythingPdfOutput(
            error=f"Invalid base64: {e}"
        )

    size_mb = len(content) / (1024 * 1024)
    log.info(
        f"embed_anything: decoded size={size_mb:.2f} MiB for {input_data.filename}"
    )

    suffix = Path(input_data.filename).suffix or ".pdf"
    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix,
        prefix="embed_",
    ) as tmp:
        tmp.write(content)
        path = tmp.name
    log.info(f"embed_anything: temp file written path={path}")

    try:
        import embed_anything

        log.info("embed_anything: loading model and config")
        model, config = _get_embed_model_and_config()

        # Run blocking embed_file in a thread while sending heartbeats so the activity
        # does not hit heartbeat_timeout (2 min) and cause "Connection lost".
        done = anyio.Event()
        result_holder: list[Any] = []

        async def run_embed_in_thread() -> None:
            try:
                r = await anyio.to_thread.run_sync(
                    lambda: embed_anything.embed_file(
                        path,
                        embedder=model,
                        config=config,
                    ),
                )
                result_holder.append(r)
            finally:
                done.set()

        async def heartbeat_loop() -> None:
            while True:
                await anyio.sleep(HEARTBEAT_INTERVAL_SECONDS)
                if done.is_set():
                    break
                heartbeat("embed_anything: processing...")

        async with anyio.create_task_group() as tg:
            tg.start_soon(run_embed_in_thread)
            tg.start_soon(heartbeat_loop)

        data = result_holder[0] if result_holder else []

        num_chunks = len(data) if data else 0
        log.info(
            f"embed_anything: total {num_chunks} chunks for "
            f"{input_data.filename}"
        )

        events = _chunk_embed_data_to_events(data, input_data)
        log.info(
            f"embed_anything: produced {len(events)} events for {input_data.filename}"
        )
        return EmbedAnythingPdfOutput(
            events=events,
            chunks_count=len(events),
        )
    except (OSError, ValueError, TypeError, AttributeError) as e:
        err_type = type(e).__name__
        log.error(
            f"embed_anything: failed filename={input_data.filename} "
            f"error_type={err_type} error={e}"
        )
        return EmbedAnythingPdfOutput(error=str(e))
    finally:
        with contextlib.suppress(OSError):
            await anyio.Path(path).unlink(missing_ok=True)
