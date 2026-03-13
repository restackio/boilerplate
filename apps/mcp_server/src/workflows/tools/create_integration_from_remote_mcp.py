"""MCP tool to create a workspace integration from a remote MCP directory entry (for the build agent)."""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow


class CreateIntegrationFromRemoteMcpInput(BaseModel):
    """Input for creating an integration from a remote MCP entry."""

    workspace_id: str = Field(
        ...,
        description="Workspace ID (e.g. from meta_info.workspace_id)",
    )
    server_url: str = Field(
        ...,
        description="MCP server URL (e.g. from searchremotemcpdirectory entry)",
    )
    server_label: str = Field(
        ...,
        description="Label for the integration (e.g. from directory entry; use only letters, numbers, hyphens, underscores)",
    )
    server_description: str | None = Field(
        default=None,
        description="Optional description for the integration",
    )


class CreateIntegrationFromRemoteMcpOutput(BaseModel):
    """Result of creating the integration."""

    success: bool = Field(..., description="True if the integration was created")
    mcp_server_id: str | None = Field(
        default=None,
        description="ID of the created MCP server; use this in addagenttool to attach tools from this integration to an agent",
    )
    error: str | None = Field(default=None, description="Error message if failed")


@workflow.defn(
    name="CreateIntegrationFromRemoteMcp",
    description="Create a new workspace integration from a remote MCP server URL. Use after searchremotemcpdirectory: pass workspace_id (from meta_info), server_url and server_label from the chosen directory entry. Returns mcp_server_id; then use addagenttool with that mcp_server_id and the tool names from that server to add tools to parent or pipeline agents.",
)
class CreateIntegrationFromRemoteMcp:
    """Create an MCP server integration in the workspace via the backend."""

    @workflow.run
    async def run(
        self, workflow_input: CreateIntegrationFromRemoteMcpInput
    ) -> CreateIntegrationFromRemoteMcpOutput:
        log.info(
            "CreateIntegrationFromRemoteMcp started",
            workspace_id=workflow_input.workspace_id,
            server_label=workflow_input.server_label,
        )
        try:
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
                return CreateIntegrationFromRemoteMcpOutput(
                    success=False, error="Backend returned no result"
                )
            mcp_server = getattr(result, "mcp_server", None) or (
                result.get("mcp_server") if isinstance(result, dict) else None
            )
            if mcp_server is None:
                return CreateIntegrationFromRemoteMcpOutput(
                    success=False, error="Backend did not return mcp_server"
                )
            server_id = (
                getattr(mcp_server, "id", None)
                or (mcp_server.get("id") if isinstance(mcp_server, dict) else None)
            )
            if not server_id:
                return CreateIntegrationFromRemoteMcpOutput(
                    success=False, error="mcp_server has no id"
                )
            return CreateIntegrationFromRemoteMcpOutput(
                success=True, mcp_server_id=str(server_id)
            )
        except Exception as e:  # noqa: BLE001
            log.error("CreateIntegrationFromRemoteMcp failed", error=str(e))
            return CreateIntegrationFromRemoteMcpOutput(
                success=False,
                error=f"Failed to create integration: {e!s}",
            )
