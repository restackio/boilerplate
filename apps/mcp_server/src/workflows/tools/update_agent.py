"""MCP tool for creating or updating an agent (interactive or pipeline).

Single tool: create if agent_id is omitted; update if agent_id is provided and exists.
Tools are not added automatically; use updateagenttool after creating/updating.
"""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow


class UpdateAgentInput(BaseModel):
    """Input for creating or updating an agent."""

    agent_id: str | None = Field(
        default=None,
        description="ID of the agent to update. Omit to create a new agent.",
    )
    workspace_id: str = Field(
        ...,
        description="Workspace ID (required for create; used to scope update)",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Agent name (slug: lowercase letters, numbers, hyphens, underscores).",
    )
    type: str = Field(
        default="interactive",
        description="Agent type: 'interactive' or 'pipeline'.",
    )
    description: str | None = Field(
        default=None, description="Optional description."
    )
    instructions: str | None = Field(
        default=None, description="Optional system instructions."
    )
    team_id: str | None = Field(
        default=None, description="Optional team ID."
    )
    model: str | None = Field(
        default="gpt-5.4",
        description="Optional model (e.g. gpt-5.4).",
    )
    reasoning_effort: str | None = Field(
        default=None,
        description="Optional: none, low, medium, high, xhigh",
    )
    status: str | None = Field(
        default="draft",
        description="Optional: draft or published.",
    )
    build_task_id: str | None = Field(
        default=None,
        description="When creating from the agent builder, pass the build task ID (meta_info.task_id) so this agent is linked to the build.",
    )


class UpdateAgentOutput(BaseModel):
    """Output after creating or updating an agent."""

    success: bool = Field(
        ..., description="True if agent was created or updated"
    )
    agent_id: str | None = Field(
        default=None, description="ID of the agent"
    )
    name: str | None = Field(
        default=None, description="Name of the agent"
    )
    type: str | None = Field(
        default=None, description="Type (interactive or pipeline)"
    )
    created: bool = Field(
        default=False,
        description="True if a new agent was created",
    )
    error: str | None = Field(
        default=None, description="Error message if failed"
    )


def _agent_id_name_type(
    agent: object, agent_type: str
) -> tuple[str | None, str | None, str]:
    """Extract id, name, type from backend agent (object or dict)."""
    aid = getattr(agent, "id", None) or (
        agent.get("id") if isinstance(agent, dict) else None
    )
    name = getattr(agent, "name", None) or (
        agent.get("name") if isinstance(agent, dict) else None
    )
    atype = getattr(agent, "type", None) or (
        agent.get("type") if isinstance(agent, dict) else agent_type
    )
    return (aid, name, atype)


@workflow.defn(
    mcp=True,
    description="Create or update an agent. Omit agent_id to create; pass agent_id to update (e.g. after user tries and wants changes). Use type pipeline for agents that extract data and save to a table (one unit per run), and also for parent agents that only orchestrate sub-pipelines via createsubtask (no chat). Use type interactive when the user should chat with the data (Q&A, exploration) or for chat/query-only agents with no child pipelines. After creating a parent that fans out work, use updateagenttool to add updatetodos and createsubtask.",
)
class UpdateAgent:
    """Workflow to create or update an agent via the backend."""

    @workflow.run
    async def run(
        self, workflow_input: UpdateAgentInput
    ) -> UpdateAgentOutput:
        """Create agent if no agent_id; otherwise update existing agent."""
        agent_id = (workflow_input.agent_id or "").strip()
        do_update = bool(agent_id)
        agent_type = (
            workflow_input.type
            if workflow_input.type in ("interactive", "pipeline")
            else "interactive"
        )
        log.info(
            "UpdateAgent started",
            workspace_id=workflow_input.workspace_id,
            name=workflow_input.name,
            type=agent_type,
            do_update=do_update,
        )
        try:
            if do_update:
                return await self._do_update(workflow_input, agent_id, agent_type)
            return await self._do_create(workflow_input, agent_type)
        except Exception as e:
            log.error("UpdateAgent failed", error=str(e))
            raise NonRetryableError(
                message=f"Failed to create/update agent: {e!s}"
            ) from e

    async def _do_update(
        self,
        workflow_input: UpdateAgentInput,
        agent_id: str,
        agent_type: str,
    ) -> UpdateAgentOutput:
        """Execute update path: call agents_update and map result."""
        update_payload = {
            "agent_id": agent_id,
            "name": workflow_input.name,
            "description": workflow_input.description,
            "instructions": workflow_input.instructions,
            "type": agent_type,
            "status": workflow_input.status or "draft",
        }
        if workflow_input.model:
            update_payload["model"] = workflow_input.model.strip() or "gpt-5.4"
        if workflow_input.reasoning_effort is not None:
            update_payload["reasoning_effort"] = workflow_input.reasoning_effort
        result = await workflow.step(
            function="agents_update",
            function_input=update_payload,
            task_queue="backend",
            start_to_close_timeout=timedelta(seconds=30),
        )
        if result and getattr(result, "agent", None):
            agent = result.agent
            aid, name, atype = _agent_id_name_type(agent, agent_type)
            return UpdateAgentOutput(
                success=True,
                agent_id=aid,
                name=name,
                type=atype,
                created=False,
            )
        err = (
            getattr(result, "error", None)
            or (result.get("error") if isinstance(result, dict) else None)
            or "Update failed"
        )
        return UpdateAgentOutput(success=False, error=str(err))

    async def _do_create(
        self,
        workflow_input: UpdateAgentInput,
        agent_type: str,
    ) -> UpdateAgentOutput:
        """Execute create path: build payload and call agents_create."""
        team_id = (
            workflow_input.team_id
            if workflow_input.team_id
            and str(workflow_input.team_id).strip() != str(workflow_input.workspace_id).strip()
            else None
        )
        function_input = {
            "workspace_id": workflow_input.workspace_id,
            "name": workflow_input.name,
            "description": workflow_input.description,
            "instructions": workflow_input.instructions,
            "type": agent_type,
            "status": workflow_input.status or "draft",
        }
        if team_id:
            function_input["team_id"] = team_id
        if workflow_input.build_task_id and str(workflow_input.build_task_id).strip():
            function_input["build_task_id"] = str(workflow_input.build_task_id).strip()
        function_input["model"] = (workflow_input.model or "").strip() or "gpt-5.4"
        if workflow_input.reasoning_effort is not None:
            function_input["reasoning_effort"] = workflow_input.reasoning_effort
        result = await workflow.step(
            function="agents_create",
            function_input=function_input,
            task_queue="backend",
            start_to_close_timeout=timedelta(seconds=30),
        )
        if result and isinstance(result, dict) and result.get("agent"):
            agent = result["agent"]
            return UpdateAgentOutput(
                success=True,
                agent_id=agent.get("id"),
                name=agent.get("name"),
                type=agent.get("type", agent_type),
                created=True,
            )
        if result and isinstance(result, dict):
            return UpdateAgentOutput(
                success=False,
                error=result.get("error", "Unknown error from backend"),
            )
        return UpdateAgentOutput(success=False, error="Backend returned no agent")
