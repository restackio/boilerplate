"""PDF → extract (OCR), chunk, embed → pipeline events using EmbedAnything.

Single activity: receives PDF base64; EmbedAnything does extract/OCR, chunking, and
embeddings. Uses a ClickHouse adapter to stream embeddings directly to pipeline_events
(vector streaming), avoiding high RAM from accumulating all chunks in memory.
PDF splitting for the 4 MB gRPC limit is done in the frontend; each payload is one part.
See https://github.com/StarlightSearch/EmbedAnything and memory_leak blog (vector streaming).

Temp file: embed_file() only accepts a file path, so we write decoded PDF to a temp file
then delete it in finally. Defaults tuned for low RAM; override with EMBED_* env vars.
"""

import asyncio
import base64
import contextlib
import tempfile
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import function, heartbeat, log

from src.adapters.clickhouse_embed_adapter import (
    ClickHouseEmbedAdapter,
)
from src.database.connection import get_clickhouse_async_client
from src.functions.embed_model_loader import (
    get_embed_model_and_config_once,
)

# Send heartbeat every N seconds during long-running embed_file (activity heartbeat_timeout is 2 min)
HEARTBEAT_INTERVAL_SECONDS = 45

# Sentinel UUID when ingestion is dataset-only (no agent context)
DATASET_ONLY_AGENT_ID = "00000000-0000-0000-0000-000000000000"


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


class EmbedAnythingPdfOutput(BaseModel):
    """Output: when using adapter, events=[] and ingested_via_adapter=True."""

    events: list[dict[str, Any]] = Field(default_factory=list)
    chunks_count: int = 0
    ingested_via_adapter: bool = Field(
        default=False,
        description="True when ClickHouse adapter was used (events already in DB).",
    )
    error: str | None = None


@function.defn()
async def embed_anything_pdf_to_events(
    input_data: EmbedAnythingPdfInput,
) -> EmbedAnythingPdfOutput:
    """PDF → extract, chunk, embed; stream directly to ClickHouse via adapter (low RAM).

    Uses EmbedAnything with a ClickHouse adapter so embeddings are written in batches
    instead of accumulated in memory. Returns chunks_count and ingested_via_adapter=True;
    caller should skip ingest_pipeline_events.
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
    del content  # Free decoded PDF so we don't hold it during embed_file (<1GiB friendly)
    log.info(f"embed_anything: temp file written path={path}")

    try:
        import embed_anything

        model, config = await get_embed_model_and_config_once()

        def run_embed() -> int:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                client = loop.run_until_complete(get_clickhouse_async_client())
                adapter = ClickHouseEmbedAdapter(
                    client,
                    agent_id=input_data.agent_id or DATASET_ONLY_AGENT_ID,
                    task_id=input_data.task_id,
                    workspace_id=input_data.workspace_id,
                    dataset_id=input_data.dataset_id,
                    event_name=input_data.event_name,
                    source_filename=input_data.filename,
                    tags=input_data.tags or ["pdf", "embed_anything"],
                )
                embed_anything.embed_file(
                    path,
                    embedder=model,
                    config=config,
                    adapter=adapter,
                )
                return adapter.insert_count
            finally:
                loop.close()

        async def send_heartbeats() -> None:
            while True:
                await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
                heartbeat("embed_anything: processing...")

        heartbeat_task = asyncio.create_task(send_heartbeats())
        try:
            chunks_count = await asyncio.to_thread(run_embed)
        finally:
            heartbeat_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await heartbeat_task

        log.info(
            f"embed_anything: streamed {chunks_count} chunks to ClickHouse for "
            f"{input_data.filename}"
        )
        return EmbedAnythingPdfOutput(
            events=[],
            chunks_count=chunks_count,
            ingested_via_adapter=True,
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
            await asyncio.to_thread(lambda: Path(path).unlink(missing_ok=True))
