"""MCP tool for creating or updating an agent tool (for use by the build agent).

Single tool: create if agent_tool_id is omitted; update if agent_tool_id is provided.
"""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow

# Restack-core MCP server ID (must match admin seed)
RESTACK_CORE_MCP_SERVER_ID = "c0000000-0000-0000-0000-000000000001"


class UpdateAgentToolInput(BaseModel):
    """Input for creating or updating one tool on an agent."""

    agent_tool_id: str | None = Field(
        default=None,
        description="ID of the agent tool to update. Omit to create (or upsert by agent_id + tool_name + mcp_server_id).",
    )
    agent_id: str = Field(
        ...,
        description="ID of the agent (required for create; from updateagent result).",
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
        description="MCP server ID; omit to use restack-core (default for build-created agents).",
    )
    require_approval: bool | None = Field(
        default=None,
        description="Optional; for update: whether the tool requires approval.",
    )
    enabled: bool | None = Field(
        default=None,
        description="Optional; for update: whether the tool is enabled.",
    )


class UpdateAgentToolOutput(BaseModel):
    """Result of creating or updating an agent tool."""

    success: bool = Field(..., description="True if the tool was created, updated, or already present")
    error: str | None = Field(default=None, description="Error message if failed")


@workflow.defn(
    mcp=True,
    description="Create or update one MCP tool on an agent. Omit agent_tool_id to create (or attach); pass agent_tool_id to update. Use after creating the parent (interactive) agent: add updatetodos then createsubtask. Pipeline agents get generatemock, transformdata, loadintodataset. Pass agent_id from updateagent result and tool_name.",
)
class UpdateAgentTool:
    """MCP workflow to create or update an agent tool via the backend."""

    @workflow.run
    async def run(self, workflow_input: UpdateAgentToolInput) -> UpdateAgentToolOutput:
        """Call backend agent_tools_update when agent_tool_id given; else agent_tools_create."""
        agent_tool_id = (workflow_input.agent_tool_id or "").strip()
        do_update = bool(agent_tool_id)

        mcp_server_id = (
            (workflow_input.mcp_server_id or "").strip()
            or RESTACK_CORE_MCP_SERVER_ID
        )
        if not do_update:
            use_default = not (
                workflow_input.mcp_server_id
                and workflow_input.mcp_server_id.strip()
            )
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
            "UpdateAgentTool started",
            agent_id=workflow_input.agent_id,
            tool_name=workflow_input.tool_name,
            do_update=do_update,
        )
        try:
            if do_update:
                update_input = {
                    "agent_tool_id": agent_tool_id,
                }
                if workflow_input.custom_description is not None:
                    update_input["custom_description"] = workflow_input.custom_description
                if workflow_input.require_approval is not None:
                    update_input["require_approval"] = workflow_input.require_approval
                if workflow_input.enabled is not None:
                    update_input["enabled"] = workflow_input.enabled
                result = await workflow.step(
                    function="agent_tools_update",
                    function_input=update_input,
                    task_queue="backend",
                    start_to_close_timeout=timedelta(seconds=30),
                )
                if result and getattr(result, "agent_tool", None) is not None:
                    return UpdateAgentToolOutput(success=True)
                if result and isinstance(result, dict) and result.get("agent_tool"):
                    return UpdateAgentToolOutput(success=True)
                return UpdateAgentToolOutput(
                    success=False,
                    error="Backend returned no agent_tool",
                )

            result = await workflow.step(
                function="agent_tools_create",
                function_input={
                    "agent_id": workflow_input.agent_id,
                    "tool_type": "mcp",
                    "mcp_server_id": mcp_server_id,
                    "tool_name": workflow_input.tool_name,
                    "custom_description": workflow_input.custom_description,
                    "require_approval": workflow_input.require_approval
                    if workflow_input.require_approval is not None
                    else False,
                    "enabled": workflow_input.enabled
                    if workflow_input.enabled is not None
                    else True,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
            if result and getattr(result, "agent_tool", None) is not None:
                return UpdateAgentToolOutput(success=True)
            if result and isinstance(result, dict) and result.get("agent_tool"):
                return UpdateAgentToolOutput(success=True)
            return UpdateAgentToolOutput(
                success=False,
                error="Backend returned no agent_tool",
            )
        except Exception as e:  # noqa: BLE001
            log.error("UpdateAgentTool failed", error=str(e))
            return UpdateAgentToolOutput(
                success=False,
                error=f"Failed to create/update tool: {e!s}",
            )
