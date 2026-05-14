"""MCP tool to list integrations already installed in the workspace (for the build agent)."""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow


class ListWorkspaceIntegrationsInput(BaseModel):
    """Input for listing workspace integrations."""

    workspace_id: str = Field(
        ...,
        description="Workspace ID (from meta_info.workspace_id)",
    )
    query: str | None = Field(
        default=None,
        description="Optional filter: matches server_label or server_description (case-insensitive). E.g. 'firecrawl'.",
    )


class WorkspaceIntegrationEntry(BaseModel):
    """A single installed integration."""

    mcp_server_id: str = Field(
        ...,
        description="MCP server ID; pass to listintegrationtools to discover tools",
    )
    server_label: str = Field(
        ..., description="Integration label (slug)"
    )
    server_url: str | None = Field(
        default=None, description="Remote MCP server URL"
    )
    server_description: str | None = Field(
        default=None, description="Description"
    )
    local: bool = Field(
        default=False,
        description="True if this is a local (built-in) integration",
    )


class ListWorkspaceIntegrationsOutput(BaseModel):
    """Installed integrations for the workspace."""

    success: bool = Field(
        ...,
        description="True if integrations were listed successfully",
    )
    integrations: list[WorkspaceIntegrationEntry] = Field(
        default_factory=list,
        description="Matching workspace integrations; use mcp_server_id with listintegrationtools",
    )
    error: str | None = Field(
        default=None, description="Error message if failed"
    )


@workflow.defn(
    mcp=True,
    description="List integrations already installed in the workspace. Use before searchremotemcpdirectory to check if an integration (e.g. firecrawl, exa) is already added. Pass optional query to filter by label/description. Returns mcp_server_id for each; pass to listintegrationtools to discover tools, then updateagenttool to attach them to an agent.",
)
class ListWorkspaceIntegrations:
    """List installed workspace integrations via the backend."""

    @workflow.run
    async def run(
        self, workflow_input: ListWorkspaceIntegrationsInput
    ) -> ListWorkspaceIntegrationsOutput:
        try:
            result = await workflow.step(
                function="mcp_servers_read",
                function_input={
                    "workspace_id": workflow_input.workspace_id,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if result is None:
                return ListWorkspaceIntegrationsOutput(
                    success=False,
                    error="Backend returned no result",
                )

            raw_servers = (
                result.get("mcp_servers", [])
                if isinstance(result, dict)
                else getattr(result, "mcp_servers", None) or []
            )

            entries: list[WorkspaceIntegrationEntry] = []
            query = (workflow_input.query or "").strip().lower()

            for s in raw_servers:
                if isinstance(s, dict):
                    label = s.get("server_label", "")
                    desc = s.get("server_description", "") or ""
                    url = s.get("server_url")
                    sid = s.get("id", "")
                    local = s.get("local", False)
                else:
                    label = getattr(s, "server_label", "")
                    desc = getattr(s, "server_description", "") or ""
                    url = getattr(s, "server_url", None)
                    sid = getattr(s, "id", "")
                    local = getattr(s, "local", False)

                if query and (
                    query not in label.lower()
                    and query not in desc.lower()
                    and (not url or query not in url.lower())
                ):
                    continue

                entries.append(
                    WorkspaceIntegrationEntry(
                        mcp_server_id=str(sid),
                        server_label=label,
                        server_url=url,
                        server_description=desc,
                        local=local,
                    )
                )

            return ListWorkspaceIntegrationsOutput(
                success=True, integrations=entries
            )
        except Exception as e:  # noqa: BLE001
            log.error(
                "ListWorkspaceIntegrations failed", error=str(e)
            )
            return ListWorkspaceIntegrationsOutput(
                success=False,
                error=f"Failed to list workspace integrations: {e!s}",
            )
