"""MCP tool for creating any agent (interactive or pipeline) in the workspace.

Tools are not added automatically; the build agent adds them with addagenttool after each createagent.
"""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import NonRetryableError, log, workflow


class CreateAgentInput(BaseModel):
    """Input for creating an agent (parent/orchestrator or pipeline)."""

    workspace_id: str = Field(
        ...,
        description="Workspace ID where the agent will be created",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Agent name (slug: lowercase letters, numbers, hyphens, underscores). Example: research-orchestrator or news-monitor",
    )
    type: str = Field(
        default="interactive",
        description="Agent type: 'interactive' for parent/orchestrator (user-facing, runs tasks, creates subtasks); 'pipeline' for ETL/worker agents that run as subtasks",
    )
    description: str | None = Field(
        default=None,
        description="Optional description of the agent",
    )
    instructions: str | None = Field(
        default=None,
        description="Optional system instructions for the agent",
    )
    team_id: str | None = Field(
        default=None,
        description="Optional team ID to assign the agent to",
    )
    model: str | None = Field(
        default="gpt-5.2",
        description="Optional model override (e.g. gpt-5.2). Default used if omitted.",
    )
    reasoning_effort: str | None = Field(
        default="low",
        description="Optional reasoning effort: none, low, medium, high, xhigh",
    )
    status: str | None = Field(
        default="draft",
        description="Optional status: draft or published",
    )


class CreateAgentOutput(BaseModel):
    """Output after creating an agent."""

    success: bool = Field(..., description="True if agent was created")
    agent_id: str | None = Field(
        default=None,
        description="ID of the created agent",
    )
    name: str | None = Field(default=None, description="Name of the agent")
    type: str | None = Field(default=None, description="Type of the agent (interactive or pipeline)")
    error: str | None = Field(default=None, description="Error message if failed")


@workflow.defn(
    description="Create an agent in the workspace. Use type 'pipeline' for ETL/worker agents first; use type 'interactive' for the parent/orchestrator (the one that will run the automation and create subtasks). Create pipeline agents first, then the parent, so the parent's instructions can reference pipeline agent id(s) and the parent can call createsubtask with pipeline agent id(s) for ETL.",
)
class CreateAgent:
    """Workflow to create any agent (interactive or pipeline) via the backend."""

    @workflow.run
    async def run(self, workflow_input: CreateAgentInput) -> CreateAgentOutput:
        """Create an agent by calling the backend agents_create function."""
        agent_type = (
            workflow_input.type
            if workflow_input.type in ("interactive", "pipeline")
            else "interactive"
        )
        log.info(
            "CreateAgent started",
            workspace_id=workflow_input.workspace_id,
            name=workflow_input.name,
            type=agent_type,
        )
        try:
            # Only pass team_id when set and not equal to workspace_id (LLM often confuses them)
            team_id = workflow_input.team_id if workflow_input.team_id and str(workflow_input.team_id).strip() != str(workflow_input.workspace_id).strip() else None
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
            model = (workflow_input.model or "").strip() or "gpt-5.2"
            function_input["model"] = model
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
                return CreateAgentOutput(
                    success=True,
                    agent_id=agent.get("id"),
                    name=agent.get("name"),
                    type=agent.get("type", agent_type),
                )
            if result and isinstance(result, dict):
                return CreateAgentOutput(
                    success=False,
                    error=result.get("error", "Unknown error from backend"),
                )
            return CreateAgentOutput(
                success=False,
                error="Backend returned no agent",
            )
        except Exception as e:
            log.error("CreateAgent failed", error=str(e))
            raise NonRetryableError(
                message=f"Failed to create agent: {e!s}"
            ) from e
