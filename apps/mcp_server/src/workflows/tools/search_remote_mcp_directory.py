"""MCP tool to search the curated remote MCP directory (for the build agent)."""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow


class SearchRemoteMcpDirectoryInput(BaseModel):
    """Input for searching the remote MCP directory."""

    query: str | None = Field(
        default=None,
        description="Optional search query; matches name, description, and tags (e.g. 'search', 'github', 'exa'). Omit to list all.",
    )


class RemoteMcpEntry(BaseModel):
    """A single entry from the directory (for output)."""

    id: str
    name: str
    server_label: str
    server_url: str
    description: str
    tags: list[str]
    auth_type: str | None = Field(
        default=None,
        description="Authentication: 'oauth', 'bearer', 'both', or 'none'",
    )


class SearchRemoteMcpDirectoryOutput(BaseModel):
    """Search results from the remote MCP directory."""

    success: bool = Field(..., description="True if the directory was read successfully")
    entries: list[RemoteMcpEntry] = Field(
        default_factory=list,
        description="Matching remote MCP entries (use server_url and server_label to create integration)",
    )
    error: str | None = Field(default=None, description="Error message if failed")


@workflow.defn(
    mcp=True,
    name="SearchRemoteMcpDirectory",
    description="Search the curated directory of remote MCP servers. Use to find relevant MCPs by keyword (e.g. search, github, exa). Returns entries with server_url, server_label, description. Use updateintegration with an entry's server_url and server_label to add it to the workspace, then updateagenttool to attach tools to an agent.",
)
class SearchRemoteMcpDirectory:
    """Search the remote MCP directory via the backend."""

    @workflow.run
    async def run(
        self, workflow_input: SearchRemoteMcpDirectoryInput
    ) -> SearchRemoteMcpDirectoryOutput:
        try:
            result = await workflow.step(
                function="remote_mcp_directory_read",
                function_input={"query": workflow_input.query},
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if result is None:
                return SearchRemoteMcpDirectoryOutput(
                    success=False, error="Backend returned no result"
                )
            entries = (
                result.get("entries", [])
                if isinstance(result, dict)
                else getattr(result, "entries", None) or []
            )
            if isinstance(entries, list):
                out_entries = [
                    RemoteMcpEntry(
                        id=e.get("id", ""),
                        name=e.get("name", ""),
                        server_label=e.get("server_label", ""),
                        server_url=e.get("server_url", ""),
                        description=e.get("description", ""),
                        tags=e.get("tags") or [],
                        auth_type=e.get("auth_type"),
                    )
                    for e in entries
                    if isinstance(e, dict)
                ]
            else:
                out_entries = [
                    RemoteMcpEntry(
                        id=getattr(e, "id", ""),
                        name=getattr(e, "name", ""),
                        server_label=getattr(e, "server_label", ""),
                        server_url=getattr(e, "server_url", ""),
                        description=getattr(e, "description", ""),
                        tags=e.tags or [],
                        auth_type=getattr(e, "auth_type", None),
                    )
                    for e in entries
                ]
            return SearchRemoteMcpDirectoryOutput(success=True, entries=out_entries)
        except Exception as e:  # noqa: BLE001
            log.error("SearchRemoteMcpDirectory failed", error=str(e))
            return SearchRemoteMcpDirectoryOutput(
                success=False,
                error=f"Failed to search directory: {e!s}",
            )
