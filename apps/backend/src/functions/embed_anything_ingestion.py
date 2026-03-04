"""PDF → extract (OCR), chunk, embed → pipeline events using EmbedAnything.

Single activity: receives PDF base64; EmbedAnything does extract/OCR, chunking, and
embeddings; returns events (metadata + embedding) for ClickHouse. No OpenAI, no API key.
See https://github.com/StarlightSearch/EmbedAnything
"""

import base64
import contextlib
import tempfile
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import function, log

from src.functions.data_ingestion import PipelineEventInput

# Lazy-loaded EmbedAnything model
_embed_model: Any = None
_embed_config: Any = None

# Default: small HF model, no GPU required
DEFAULT_MODEL_ID = "sentence-transformers/all-MiniLM-L12-v2"

_IMPORT_ERR_MSG = (
    "embed-anything not installed. pip install embed-anything"
)


def _get_embed_model_and_config() -> tuple[Any, Any]:
    """Lazy-load EmbedAnything model and config once."""
    global _embed_model, _embed_config  # noqa: PLW0603
    if _embed_model is not None:
        return _embed_model, _embed_config
    try:
        from embed_anything import EmbeddingModel, TextEmbedConfig
    except ImportError as e:
        raise ImportError(_IMPORT_ERR_MSG) from e
    _embed_model = EmbeddingModel.from_pretrained_hf(
        model_id=DEFAULT_MODEL_ID,
    )
    _embed_config = TextEmbedConfig(
        chunk_size=1000,
        batch_size=32,
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
    agent_id: str | None = Field(..., min_length=1)
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
    try:
        content = base64.b64decode(
            input_data.content_base64, validate=True
        )
    except (ValueError, TypeError) as e:
        log.error(f"Invalid base64 for {input_data.filename}: {e}")
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

    try:
        import embed_anything

        model, config = _get_embed_model_and_config()
        data = embed_anything.embed_file(
            path,
            embedder=model,
            config=config,
        )
        # data is list of EmbedData (text, embedding, metadata)
        events: list[dict[str, Any]] = []
        for i, item in enumerate(data):
            text = getattr(item, "text", "") or ""
            emb = getattr(item, "embedding", None)
            meta = getattr(item, "metadata", None) or {}
            if not isinstance(meta, dict):
                meta = (
                    {} if meta is None else {"value": str(meta)}
                )
            if not isinstance(emb, list):
                try:
                    emb = list(emb) if emb is not None else []
                except (TypeError, ValueError):
                    emb = []
            event = PipelineEventInput(
                agent_id=input_data.agent_id or "",
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
                embedding=emb if emb else None,
                event_timestamp=None,
            )
            events.append(event.model_dump())

        return EmbedAnythingPdfOutput(
            events=events,
            chunks_count=len(events),
        )
    except (OSError, ValueError, TypeError, AttributeError) as e:
        log.error(f"EmbedAnything failed for {input_data.filename}: {e}")
        return EmbedAnythingPdfOutput(error=str(e))
    finally:
        with contextlib.suppress(OSError):
            Path(path).unlink(missing_ok=True)
