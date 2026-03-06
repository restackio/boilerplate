"""ClickHouse adapter for EmbedAnything: stream embeddings directly to pipeline_events.

Uses AsyncClient only; embed_file runs in a thread and upsert() bridges to async insert
via the thread's event loop. One embed batch = one bulk insert (set batch_size to 1000+
in embed_model_loader).
"""

import asyncio
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from embed_anything import EmbedData
from embed_anything.vectordb import Adapter

logger = logging.getLogger(__name__)

PIPELINE_EVENTS_COLUMNS = [
    "id",
    "agent_id",
    "task_id",
    "workspace_id",
    "dataset_id",
    "event_name",
    "raw_data",
    "transformed_data",
    "tags",
    "embedding",
    "event_timestamp",
    "ingested_at",
]


class ClickHouseEmbedAdapter(Adapter):
    """Adapter that streams EmbedAnything output to ClickHouse via AsyncClient.

    Use from the thread that runs embed_file after asyncio.set_event_loop(loop);
    upsert() (sync) uses get_event_loop() and run_until_complete for the insert.
    """

    def __init__(  # noqa: PLR0913
        self,
        client: Any,  # clickhouse_connect.driver.AsyncClient
        *,
        agent_id: str,
        workspace_id: str,
        dataset_id: str,
        event_name: str,
        source_filename: str,
        task_id: str | None = None,
        tags: list[str] | None = None,
        table_name: str = "pipeline_events",
    ) -> None:
        self.client = client
        self.agent_id = agent_id
        self.task_id = task_id
        self.workspace_id = workspace_id
        self.dataset_id = dataset_id
        self.event_name = event_name
        self.source_filename = source_filename
        self.tags = tags or []
        self.table_name = table_name
        self._chunk_offset = 0
        self.insert_count = 0

    def create_index(
        self,
        dimension: int,
        metric: str = "cosine",
        **kwargs: Any,
    ) -> None:
        """No-op: pipeline_events table already exists."""

    def delete_index(self, _index_name: str) -> None:
        """Not supported for pipeline_events (shared table)."""
        logger.warning("ClickHouseEmbedAdapter.delete_index is a no-op")

    def convert(self, embeddings: list[EmbedData]) -> list[dict[str, Any]]:
        """Map a batch of EmbedData (or dicts from library) to pipeline_events row dicts."""
        rows = []
        event_ts = datetime.now(tz=UTC)
        for i, item in enumerate(embeddings):
            chunk_index = self._chunk_offset + i
            if isinstance(item, dict):
                text = item.get("text", "") or ""
                emb = item.get("embedding")
                meta = item.get("metadata") or {}
            else:
                text = getattr(item, "text", "") or ""
                emb = getattr(item, "embedding", None)
                meta = getattr(item, "metadata", None) or {}
            if not isinstance(meta, dict):
                meta = {} if meta is None else {"value": str(meta)}
            if emb is not None and not isinstance(emb, list):
                try:
                    emb = list(emb)
                except (TypeError, ValueError):
                    emb = []
            emb_list = emb if isinstance(emb, list) else []
            row = {
                "id": str(uuid.uuid4()),
                "agent_id": self.agent_id,
                "task_id": self.task_id,
                "workspace_id": self.workspace_id,
                "dataset_id": self.dataset_id,
                "event_name": self.event_name,
                "raw_data": {
                    "text": text,
                    "source": self.source_filename,
                    "chunk_index": chunk_index,
                    "metadata": meta,
                },
                "transformed_data": None,
                "tags": [*self.tags, f"chunk_{chunk_index}"],
                "embedding": emb_list,
                "event_timestamp": event_ts,
                "ingested_at": datetime.now(tz=UTC),
            }
            rows.append(row)
        return rows

    async def _insert_batch_async(self, formatted: list[list[Any]]) -> None:
        """One bulk insert via AsyncClient."""
        if not formatted:
            return
        await self.client.insert(
            table=self.table_name,
            data=formatted,
            column_names=PIPELINE_EVENTS_COLUMNS,
        )
        self.insert_count += len(formatted)
        logger.debug(
            "ClickHouseEmbedAdapter: inserted %d rows (total %d)",
            len(formatted),
            self.insert_count,
        )

    def upsert(self, data: list[EmbedData]) -> None:
        """Convert batch to rows and bulk insert via AsyncClient."""
        if not data:
            return
        rows = self.convert(data)
        formatted = [[r[col] for col in PIPELINE_EVENTS_COLUMNS] for r in rows]
        self._chunk_offset += len(rows)
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self._insert_batch_async(formatted))
