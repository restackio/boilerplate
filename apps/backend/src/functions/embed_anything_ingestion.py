"""PDF → extract, chunk, embed → pipeline_events via EmbedAnything and ClickHouse adapter.

One subprocess per PDF (child exits so OS reclaims memory). Vector streaming to ClickHouse.
Env: EMBED_CHUNK_SIZE, EMBED_BATCH_SIZE, EMBED_BUFFER_SIZE.
"""

import asyncio
import base64
import contextlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import function, heartbeat, log

HEARTBEAT_INTERVAL_SECONDS = 45


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

    suffix = Path(input_data.filename).suffix or ".pdf"
    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix,
        prefix="embed_",
    ) as tmp:
        tmp.write(content)
        path = tmp.name
    del content

    json_path = None
    try:
        payload = {
            "pdf_path": path,
            "agent_id": input_data.agent_id,
            "task_id": input_data.task_id,
            "workspace_id": input_data.workspace_id,
            "dataset_id": input_data.dataset_id,
            "event_name": input_data.event_name,
            "source_filename": input_data.filename,
            "tags": input_data.tags or ["pdf", "embed_anything"],
        }
        fd, json_path = tempfile.mkstemp(
            prefix="embed_", suffix=".json"
        )
        os.close(fd)
        Path(json_path).write_text(json.dumps(payload))

        async def send_heartbeats() -> None:
            while True:
                await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
                heartbeat("embed_anything: processing...")

        def run_subprocess() -> subprocess.CompletedProcess[str]:
            return subprocess.run(  # noqa: S603 (json_path is our temp file path)
                [
                    sys.executable,
                    "-m",
                    "src.functions.embed_subprocess_runner",
                    json_path,
                ],
                capture_output=True,
                check=False,
                text=True,
                timeout=600,
                env=os.environ,
            )

        heartbeat_task = asyncio.create_task(send_heartbeats())
        try:
            proc = await asyncio.to_thread(run_subprocess)
        finally:
            heartbeat_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await heartbeat_task

        if proc.returncode != 0:
            err = (
                proc.stderr or ""
            ).strip() or f"exit code {proc.returncode}"
            log.error(
                f"embed_anything: subprocess failed filename={input_data.filename} {err}"
            )
            return EmbedAnythingPdfOutput(error=err)
        chunks_count = int(proc.stdout.strip().splitlines()[0])
        log.info(
            f"embed_anything: streamed {chunks_count} chunks for {input_data.filename}"
        )
        return EmbedAnythingPdfOutput(
            events=[],
            chunks_count=chunks_count,
            ingested_via_adapter=True,
        )
    except subprocess.TimeoutExpired as e:
        log.error(
            f"embed_anything: subprocess timeout filename={input_data.filename} {e}"
        )
        return EmbedAnythingPdfOutput(
            error=f"Subprocess timeout: {e}"
        )
    except (ValueError, OSError) as e:
        log.error(
            f"embed_anything: subprocess error filename={input_data.filename} {e}"
        )
        return EmbedAnythingPdfOutput(error=str(e))
    finally:
        if json_path is not None:
            with contextlib.suppress(OSError):
                Path(json_path).unlink(missing_ok=True)
        with contextlib.suppress(OSError):
            Path(path).unlink(missing_ok=True)
