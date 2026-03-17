"""MCP tool for creating or updating a workspace integration (MCP server).

Single tool: create from remote URL if mcp_server_id is omitted; update if mcp_server_id is provided.
"""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow


class UpdateIntegrationInput(BaseModel):
    """Input for creating or updating an integration."""

    mcp_server_id: str | None = Field(
        default=None,
        description="ID of the integration to update. Omit to create from remote URL.",
    )
    workspace_id: str = Field(
        ...,
        description="Workspace ID (required for create; used to scope update).",
    )
    server_url: str = Field(
        ...,
        description="MCP server URL (e.g. from searchremotemcpdirectory). Required for create.",
    )
    server_label: str = Field(
        ...,
        description="Label for the integration (slug: letters, numbers, hyphens, underscores).",
    )
    server_description: str | None = Field(
        default=None,
        description="Optional description for the integration.",
    )


class UpdateIntegrationOutput(BaseModel):
    """Result of creating or updating the integration."""

    success: bool = Field(..., description="True if the integration was created or updated")
    mcp_server_id: str | None = Field(
        default=None,
        description="ID of the MCP server; use in updateagenttool to attach tools.",
    )
    created: bool = Field(default=False, description="True if a new integration was created")
    error: str | None = Field(default=None, description="Error message if failed")


@workflow.defn(
    mcp=True,
    name="UpdateIntegration",
    description="Create or update a workspace integration from a remote MCP URL. Omit mcp_server_id to create (after searchremotemcpdirectory); pass mcp_server_id to update label/description. Returns mcp_server_id; then use listintegrationtools and updateagenttool to attach tools to agents.",
)
class UpdateIntegration:
    """Create or update an MCP server integration in the workspace via the backend."""

    @workflow.run
    async def run(  # noqa: PLR0911
        self, workflow_input: UpdateIntegrationInput
    ) -> UpdateIntegrationOutput:
        mcp_server_id = (workflow_input.mcp_server_id or "").strip()
        do_update = bool(mcp_server_id)
        log.info(
            "UpdateIntegration started",
            workspace_id=workflow_input.workspace_id,
            server_label=workflow_input.server_label,
            do_update=do_update,
        )
        try:
            if do_update:
                payload = {
                    "mcp_server_id": mcp_server_id,
                    "server_label": workflow_input.server_label,
                    "server_url": workflow_input.server_url.strip() or None,
                    "server_description": workflow_input.server_description or "",
                }
                result = await workflow.step(
                    function="mcp_servers_update",
                    function_input=payload,
                    task_queue="backend",
                    start_to_close_timeout=timedelta(seconds=30),
                )
                if result is None:
                    return UpdateIntegrationOutput(
                        success=False, error="Backend returned no result"
                    )
                mcp_server = getattr(result, "mcp_server", None) or (
                    result.get("mcp_server") if isinstance(result, dict) else None
                )
                if mcp_server is None:
                    return UpdateIntegrationOutput(
                        success=False, error="Backend did not return mcp_server"
                    )
                server_id = (
                    getattr(mcp_server, "id", None)
                    or (mcp_server.get("id") if isinstance(mcp_server, dict) else None)
                )
                if not server_id:
                    return UpdateIntegrationOutput(
                        success=False, error="mcp_server has no id"
                    )
                return UpdateIntegrationOutput(
                    success=True,
                    mcp_server_id=str(server_id),
                    created=False,
                )
            # Create from remote
            result = await workflow.step(
                function="mcp_servers_create",
                function_input={
                    "workspace_id": workflow_input.workspace_id,
                    "server_label": workflow_input.server_label,
                    "server_url": workflow_input.server_url.strip(),
                    "local": False,
                    "server_description": workflow_input.server_description or "",
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if result is None:
                return UpdateIntegrationOutput(
                    success=False, error="Backend returned no result"
                )
            mcp_server = getattr(result, "mcp_server", None) or (
                result.get("mcp_server") if isinstance(result, dict) else None
            )
            if mcp_server is None:
                return UpdateIntegrationOutput(
                    success=False, error="Backend did not return mcp_server"
                )
            server_id = (
                getattr(mcp_server, "id", None)
                or (mcp_server.get("id") if isinstance(mcp_server, dict) else None)
            )
            if not server_id:
                return UpdateIntegrationOutput(
                    success=False, error="mcp_server has no id"
                )
            return UpdateIntegrationOutput(
                success=True,
                mcp_server_id=str(server_id),
                created=True,
            )
        except Exception as e:  # noqa: BLE001
            log.error("UpdateIntegration failed", error=str(e))
            return UpdateIntegrationOutput(
                success=False,
                error=f"Failed to create/update integration: {e!s}",
            )
