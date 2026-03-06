"""Adapters for external services (e.g. EmbedAnything → ClickHouse)."""

from src.adapters.clickhouse_embed_adapter import (
    ClickHouseEmbedAdapter,
)

__all__ = ["ClickHouseEmbedAdapter"]
