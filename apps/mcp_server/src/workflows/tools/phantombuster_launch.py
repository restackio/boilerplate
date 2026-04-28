"""MCP tool to launch PhantomBuster LinkedIn Activity Extractor runs."""

from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import import_functions, workflow

with import_functions():
    from src.functions.phantombuster_client import (
        PhantomBusterLaunchAgentInput,
        PhantomBusterLaunchAgentOutput,
        phantombuster_launch_agent,
    )


class PhantomBusterLaunchInput(BaseModel):
    """Input for launching a PhantomBuster LinkedIn extraction run."""

    profile_urls: list[str] = Field(
        default_factory=list,
        description="LinkedIn profile URLs of CIO/CTO targets.",
    )
    phantom_id: str | None = Field(
        default=None,
        description=(
            "Optional PhantomBuster phantom ID override. "
            "Defaults to PHANTOMBUSTER_ACTIVITY_EXTRACTOR_PHANTOM_ID."
        ),
    )


@workflow.defn(
    mcp=True,
    name="phantombuster_launch_agent",
    description=(
        "Launch a PhantomBuster LinkedIn Activity Extractor run for a list "
        "of LinkedIn profile URLs."
    ),
)
class PhantomBusterLaunch:
    """Workflow wrapper around the PhantomBuster launch function."""

    @workflow.run
    async def run(
        self, workflow_input: PhantomBusterLaunchInput
    ) -> PhantomBusterLaunchAgentOutput:
        return await workflow.step(
            function=phantombuster_launch_agent,
            function_input=PhantomBusterLaunchAgentInput(
                profile_urls=workflow_input.profile_urls,
                phantom_id=workflow_input.phantom_id,
            ),
            task_queue="mcp_server",
            start_to_close_timeout=timedelta(seconds=90),
        )
