"""Run one PDF embed in a subprocess; child exits so OS reclaims memory.

Only this child process loads the embed model; the parent worker never imports
embed_anything, so ensure_embed_model_loaded is not needed.
Invoked as: python -m src.functions.embed_subprocess_runner <path_to_json>
JSON: pdf_path, agent_id, task_id, workspace_id, dataset_id, event_name, source_filename, tags.
Prints insert_count to stdout; stderr + exit 1 on error.
"""

import asyncio
import contextlib
import json
import os
import sys
import tempfile
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ARGC_EXPECTED = 2
DATASET_ONLY_AGENT_ID = "00000000-0000-0000-0000-000000000000"
EXIT_USAGE = 2


def _path_for_embed_anything(
    file_path: str,
) -> tuple[str, Path | None]:
    """embed_file supports pdf, md, txt, docx — normalize CSV via a temp .txt."""
    path = Path(file_path)
    if path.suffix.lower() != ".csv":
        return file_path, None
    text = path.read_text(encoding="utf-8", errors="replace")
    fd, tmp = tempfile.mkstemp(prefix="embed_csv_", suffix=".txt")
    os.close(fd)
    tmp_path = Path(tmp)
    tmp_path.write_text(text, encoding="utf-8")
    return str(tmp_path), tmp_path


def _embedding_model_and_config() -> tuple[Any, Any]:
    from embed_anything import EmbeddingModel, TextEmbedConfig

    from src.functions.embed_model_loader import (
        DEFAULT_MODEL_ID,
        _embed_config_values,
    )

    chunk_size, batch_size, buffer_size = _embed_config_values()
    model = EmbeddingModel.from_pretrained_hf(
        model_id=DEFAULT_MODEL_ID
    )
    config = TextEmbedConfig(
        chunk_size=chunk_size,
        batch_size=batch_size,
        buffer_size=buffer_size,
        splitting_strategy="sentence",
    )
    return model, config


@dataclass(frozen=True, slots=True)
class _EmbedThreadContext:
    pdf_path: str
    agent_id: str
    task_id: str | None
    workspace_id: str
    dataset_id: str
    event_name: str
    source_filename: str
    tags: list[str]
    model: Any
    config: Any


def _embed_worker(
    ctx: _EmbedThreadContext,
    result: list[int | BaseException],
) -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        from src.adapters.clickhouse_embed_adapter import (
            ClickHouseEmbedAdapter,
        )
        from src.database.connection import (
            get_clickhouse_async_client,
        )

        client = loop.run_until_complete(
            get_clickhouse_async_client()
        )
        adapter = ClickHouseEmbedAdapter(
            client,
            agent_id=ctx.agent_id,
            task_id=ctx.task_id,
            workspace_id=ctx.workspace_id,
            dataset_id=ctx.dataset_id,
            event_name=ctx.event_name,
            source_filename=ctx.source_filename,
            tags=ctx.tags,
        )
        import embed_anything

        embed_path, csv_txt_cleanup = _path_for_embed_anything(
            ctx.pdf_path
        )
        try:
            embed_anything.embed_file(
                embed_path,
                embedder=ctx.model,
                config=ctx.config,
                adapter=adapter,
            )
        finally:
            if csv_txt_cleanup is not None:
                with contextlib.suppress(OSError):
                    csv_txt_cleanup.unlink(missing_ok=True)
        result.append(adapter.insert_count)
    except BaseException as e:  # noqa: BLE001 (intentionally catch all to report back)
        result.append(e)
    finally:
        loop.close()


def _run() -> int:
    if len(sys.argv) != ARGC_EXPECTED:
        sys.stderr.write(
            "Usage: python -m src.functions.embed_subprocess_runner <json_path>\n"
        )
        sys.exit(EXIT_USAGE)
    json_path = Path(sys.argv[1])
    if not json_path.is_file():
        sys.stderr.write(f"Not a file: {json_path}\n")
        sys.exit(EXIT_USAGE)
    payload = json.loads(json_path.read_text())

    pdf_path = payload["pdf_path"]
    agent_id = payload.get("agent_id") or DATASET_ONLY_AGENT_ID
    task_id = payload.get("task_id")
    workspace_id = payload["workspace_id"]
    dataset_id = payload["dataset_id"]
    event_name = payload.get("event_name", "PDF Chunk")
    source_filename = payload["source_filename"]
    tags = payload.get("tags") or ["pdf", "embed_anything"]

    model, config = _embedding_model_and_config()
    result: list[int | BaseException] = []
    ctx = _EmbedThreadContext(
        pdf_path=pdf_path,
        agent_id=agent_id,
        task_id=task_id,
        workspace_id=workspace_id,
        dataset_id=dataset_id,
        event_name=event_name,
        source_filename=source_filename,
        tags=tags,
        model=model,
        config=config,
    )
    t = threading.Thread(
        target=_embed_worker,
        args=(ctx, result),
    )
    t.start()
    t.join()
    r = result[0]
    if isinstance(r, BaseException):
        raise r
    return r


if __name__ == "__main__":
    try:
        count = _run()
        print(count)  # noqa: T201 (stdout contract for parent process)
    except Exception as e:  # noqa: BLE001 (CLI: catch any error and exit 1)
        sys.stderr.write(f"embed_subprocess_runner: {e}\n")
        sys.exit(1)
