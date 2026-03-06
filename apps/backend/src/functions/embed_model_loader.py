"""Load EmbedAnything model once on first use; used by workflows as a step and by embed_anything_ingestion."""

import asyncio
import os
from typing import Any

from pydantic import BaseModel
from restack_ai.function import function, log

# Loaded once on first use (workflow step ensure_embed_model_loaded); shared across invocations on same worker
_embed_model: Any = None
_embed_config: Any = None
_embed_load_lock = asyncio.Lock()

DEFAULT_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 1200
# One embed batch = one ClickHouse bulk insert (recommended 1k-10k rows)
BATCH_SIZE = 1000
BUFFER_SIZE = 8

_IMPORT_ERR_MSG = "embed-anything not installed. pip install embed-anything"


def _embed_config_values() -> tuple[int, int, int]:
    """Chunk size, batch size, buffer size (env overrides optional)."""
    return (
        int(os.environ.get("EMBED_CHUNK_SIZE", CHUNK_SIZE)),
        int(os.environ.get("EMBED_BATCH_SIZE", BATCH_SIZE)),
        int(os.environ.get("EMBED_BUFFER_SIZE", BUFFER_SIZE)),
    )


def _load_embed_model_and_config() -> None:
    """Load EmbedAnything model and config (blocking)."""
    global _embed_model, _embed_config  # noqa: PLW0603
    if _embed_model is not None:
        return
    try:
        from embed_anything import EmbeddingModel, TextEmbedConfig
    except ImportError as e:
        raise ImportError(_IMPORT_ERR_MSG) from e
    chunk_size, batch_size, buffer_size = _embed_config_values()
    log.info(
        f"embed_model_loader: loading HuggingFace model {DEFAULT_MODEL_ID} "
        f"(chunk={chunk_size} batch={batch_size} buffer={buffer_size})"
    )
    _embed_model = EmbeddingModel.from_pretrained_hf(model_id=DEFAULT_MODEL_ID)
    log.info("embed_model_loader: model loaded")
    _embed_config = TextEmbedConfig(
        chunk_size=chunk_size,
        batch_size=batch_size,
        buffer_size=buffer_size,
        splitting_strategy="sentence",
    )


async def get_embed_model_and_config_once() -> tuple[Any, Any]:
    """Load model once on first call; concurrent callers wait and get the same cached instance."""
    async with _embed_load_lock:
        if _embed_model is not None and _embed_config is not None:
            return _embed_model, _embed_config
        await asyncio.to_thread(_load_embed_model_and_config)
        return _embed_model, _embed_config


class EnsureEmbedModelInput(BaseModel):
    """No input required; allows workflow step to call with empty payload."""


class EnsureEmbedModelOutput(BaseModel):
    """Output of ensure_embed_model_loaded (model ready for use)."""

    ready: bool = True


@function.defn()
async def ensure_embed_model_loaded(
    _input: EnsureEmbedModelInput | None = None,
) -> EnsureEmbedModelOutput:
    """Ensure EmbedAnything model is loaded on this worker. Call as first step in workflows that need it.

    Loads once; concurrent callers wait. Reduces memory when no ingestion runs; visible in Temporal history.
    """
    await get_embed_model_and_config_once()
    return EnsureEmbedModelOutput(ready=True)
