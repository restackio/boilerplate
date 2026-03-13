"""MCP tool to list tool names for an integration (for the build agent)."""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow


class ListIntegrationToolsInput(BaseModel):
    """Input for listing tools of an MCP server/integration."""

    mcp_server_id: str = Field(
        ...,
        description="MCP server ID (e.g. from createintegrationfromremotemcp result)",
    )
    workspace_id: str = Field(
        ...,
        description="Workspace ID (e.g. from meta_info.workspace_id)",
    )


class ListIntegrationToolsOutput(BaseModel):
    """Tool names for the integration."""

    success: bool = Field(
        ...,
        description="True if tools were listed successfully",
    )
    tools: list[str] = Field(
        default_factory=list,
        description="Tool names; call addagenttool once per tool with this mcp_server_id and agent_id",
    )
    error: str | None = Field(default=None, description="Error message if failed")


@workflow.defn(
    name="ListIntegrationTools",
    description="List tool names for an integration (MCP server). Use after createintegrationfromremotemcp: pass the returned mcp_server_id and workspace_id from meta_info. Returns a list of tool names; then call addagenttool for each tool name to attach them to the parent or pipeline agent.",
)
class ListIntegrationTools:
    """List tools for an MCP server via the backend."""

    @workflow.run
    async def run(
        self, workflow_input: ListIntegrationToolsInput
    ) -> ListIntegrationToolsOutput:
        try:
            result = await workflow.step(
                function="list_mcp_server_tools",
                function_input={
                    "mcp_server_id": workflow_input.mcp_server_id,
                    "workspace_id": workflow_input.workspace_id,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if result is None:
                return ListIntegrationToolsOutput(
                    success=False, error="Backend returned no result"
                )
            if isinstance(result, dict):
                return ListIntegrationToolsOutput(
                    success=result.get("success", False),
                    tools=result.get("tools") or [],
                    error=result.get("error"),
                )
            return ListIntegrationToolsOutput(
                success=getattr(result, "success", False),
                tools=getattr(result, "tools", None) or [],
                error=getattr(result, "error", None),
            )
        except Exception as e:  # noqa: BLE001
            log.error("ListIntegrationTools failed", error=str(e))
            return ListIntegrationToolsOutput(
                success=False,
                error=f"Failed to list tools: {e!s}",
            )
