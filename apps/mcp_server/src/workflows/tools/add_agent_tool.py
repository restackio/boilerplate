"""MCP tool for adding a tool to an existing agent (for use by the build agent)."""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow

# Restack-core MCP server ID (must match admin seed)
RESTACK_CORE_MCP_SERVER_ID = "c0000000-0000-0000-0000-000000000001"


class AddAgentToolInput(BaseModel):
    """Input for adding one tool to an agent."""

    agent_id: str = Field(
        ...,
        description="ID of the agent to add the tool to (e.g. from createagent result)",
    )
    tool_name: str = Field(
        ...,
        description="Tool name (e.g. updatetodos, createsubtask, generatemock, transformdata, loadintodataset). Must exist on restack-core.",
    )
    custom_description: str | None = Field(
        default=None,
        description="Optional description for this tool on this agent",
    )
    mcp_server_id: str | None = Field(
        default=None,
        description="MCP server ID; omit to use restack-core (default for build-created agents)",
    )


class AddAgentToolOutput(BaseModel):
    """Result of adding a tool to an agent."""

    success: bool = Field(..., description="True if the tool was added or already present")
    error: str | None = Field(default=None, description="Error message if failed")


@workflow.defn(
    name="AddAgentTool",
    description="Add one MCP tool to an existing agent. Use after creating the parent (interactive) agent: add updatetodos then createsubtask to the parent. Pipeline agents get generatemock, transformdata, loadintodataset automatically. Pass agent_id from the createagent result and the tool_name.",
)
class AddAgentTool:
    """MCP workflow to add a tool to an agent via the backend."""

    @workflow.run
    async def run(self, workflow_input: AddAgentToolInput) -> AddAgentToolOutput:
        """Call backend agent_tools_create to attach the tool to the agent."""
        use_default = not (
            workflow_input.mcp_server_id
            and workflow_input.mcp_server_id.strip()
        )
        mcp_server_id = (
            (workflow_input.mcp_server_id or "").strip()
            or RESTACK_CORE_MCP_SERVER_ID
        )
        # When using restack-core (default), resolve the agent's workspace
        # restack-core so tools are added to the correct server (tenant
        # workspaces have their own restack-core).
        if use_default or mcp_server_id == RESTACK_CORE_MCP_SERVER_ID:
            try:
                resolved = await workflow.step(
                    function="get_restack_core_mcp_server_id_for_agent",
                    function_input={"agent_id": workflow_input.agent_id},
                    task_queue="backend",
                    start_to_close_timeout=timedelta(seconds=15),
                )
                if resolved and isinstance(resolved, str):
                    mcp_server_id = resolved
            except Exception:  # noqa: BLE001, S110
                pass
        log.info(
            "AddAgentTool started",
            agent_id=workflow_input.agent_id,
            tool_name=workflow_input.tool_name,
        )
        try:
            result = await workflow.step(
                function="agent_tools_create",
                function_input={
                    "agent_id": workflow_input.agent_id,
                    "tool_type": "mcp",
                    "mcp_server_id": mcp_server_id,
                    "tool_name": workflow_input.tool_name,
                    "custom_description": workflow_input.custom_description,
                    "require_approval": False,
                    "enabled": True,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if result and getattr(result, "agent_tool", None) is not None:
                return AddAgentToolOutput(success=True)
            if result and isinstance(result, dict) and result.get("agent_tool"):
                return AddAgentToolOutput(success=True)
            return AddAgentToolOutput(
                success=False,
                error="Backend returned no agent_tool",
            )
        except Exception as e:  # noqa: BLE001
            log.error("AddAgentTool failed", error=str(e))
            return AddAgentToolOutput(
                success=False,
                error=f"Failed to add tool: {e!s}",
            )
