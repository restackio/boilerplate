"""Curated directory of remote MCP servers for quick-add and build agent."""

import asyncio
import json
from pathlib import Path

from pydantic import BaseModel, Field
from restack_ai.function import function


class RemoteMcpDirectoryEntry(BaseModel):
    """A single entry in the remote MCP directory."""

    id: str = Field(..., description="Unique id (slug)")
    name: str = Field(..., description="Display name")
    server_label: str = Field(
        ...,
        description="Label for the MCP server (used when creating integration)",
    )
    server_url: str = Field(..., description="MCP server URL")
    description: str = Field(
        default="", description="Short description"
    )
    tags: list[str] = Field(
        default_factory=list,
        description="Tags for search (e.g. search, web, github)",
    )
    auth_type: str | None = Field(
        default=None,
        description="Authentication: 'oauth' (OAuth 2.1), 'bearer' (API key / Bearer token), 'both', or 'none'",
    )


class RemoteMcpDirectoryInput(BaseModel):
    """Input for searching the remote MCP directory."""

    query: str | None = Field(
        default=None,
        description="Optional search query; matches name, description, and tags (case-insensitive)",
    )


class RemoteMcpDirectoryOutput(BaseModel):
    """List of directory entries (optionally filtered)."""

    entries: list[RemoteMcpDirectoryEntry] = Field(
        default_factory=list,
        description="Matching remote MCP directory entries",
    )


def _get_directory_path() -> Path:
    """Path to the curated directory JSON file."""
    return (
        Path(__file__).resolve().parent.parent
        / "data"
        / "remote_mcp_directory.json"
    )


def _load_directory() -> list[RemoteMcpDirectoryEntry]:
    """Load and parse the directory JSON."""
    path = _get_directory_path()
    if not path.exists():
        return []
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    return [
        RemoteMcpDirectoryEntry.model_validate(entry)
        for entry in data
    ]


@function.defn()
async def remote_mcp_directory_read(
    function_input: RemoteMcpDirectoryInput,
) -> RemoteMcpDirectoryOutput:
    """Return curated remote MCP directory entries, optionally filtered by search query."""
    entries = await asyncio.to_thread(_load_directory)
    query = (function_input.query or "").strip().lower()
    if query:
        entries = [
            e
            for e in entries
            if query in e.name.lower()
            or query in (e.description or "").lower()
            or any(query in t.lower() for t in e.tags)
            or query in e.server_label.lower()
        ]
    return RemoteMcpDirectoryOutput(entries=entries)
