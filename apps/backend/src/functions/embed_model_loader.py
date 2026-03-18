"""Config and model ID for embed subprocess runner. Override via EMBED_CHUNK_SIZE, EMBED_BATCH_SIZE, EMBED_BUFFER_SIZE."""

import os

DEFAULT_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 1200
BATCH_SIZE = 8
BUFFER_SIZE = 1


def _embed_config_values() -> tuple[int, int, int]:
    """Chunk, batch, buffer."""
    return (
        int(os.environ.get("EMBED_CHUNK_SIZE", CHUNK_SIZE)),
        int(os.environ.get("EMBED_BATCH_SIZE", BATCH_SIZE)),
        int(os.environ.get("EMBED_BUFFER_SIZE", BUFFER_SIZE)),
    )
