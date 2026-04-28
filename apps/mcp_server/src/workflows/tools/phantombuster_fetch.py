"""MCP tool to fetch PhantomBuster LinkedIn activity results."""

from datetime import timedelta

from pydantic import BaseModel, Field, model_validator
from restack_ai.workflow import NonRetryableError, import_functions, workflow

with import_functions():
    from src.functions.phantombuster_client import (
        PhantomBusterFetchOutputInput,
        PhantomBusterFetchOutputOutput,
        phantombuster_fetch_output,
        phantombuster_launch_agent,
    )


class PhantomBusterFetchInput(BaseModel):
    """Input for fetching PhantomBuster LinkedIn activity output."""

    container_id: str | None = Field(
        default=None,
        description="Container ID from phantombuster_launch_agent.",
    )
    profile_urls: list[str] = Field(
        default_factory=list,
        description=(
            "Optional profile URLs. If container_id is omitted, the workflow "
            "launches a run first using these URLs."
        ),
    )
    phantom_id: str | None = Field(
        default=None,
        description="Optional PhantomBuster phantom ID override.",
    )

    @model_validator(mode="after")
    def validate_inputs(self) -> "PhantomBusterFetchInput":
        if self.container_id:
            return self
        if self.profile_urls:
            return self
        raise ValueError(
            "Provide container_id or at least one profile_url."
        )


@workflow.defn(
    mcp=True,
    name="phantombuster_fetch_output",
    description=(
        "Fetch latest posts/comments/articles extracted by PhantomBuster. "
        "Pass container_id from a previous launch, or pass profile_urls "
        "to auto-launch and then fetch output."
    ),
)
class PhantomBusterFetch:
    """Workflow wrapper that can auto-launch then fetch results."""

    @workflow.run
    async def run(
        self, workflow_input: PhantomBusterFetchInput
    ) -> PhantomBusterFetchOutputOutput:
        container_id = workflow_input.container_id

        if not container_id:
            launch_result = await workflow.step(
                function=phantombuster_launch_agent,
                function_input={
                    "profile_urls": workflow_input.profile_urls,
                    "phantom_id": workflow_input.phantom_id,
                },
                task_queue="mcp_server",
                start_to_close_timeout=timedelta(seconds=90),
            )
            container_id = launch_result.container_id
            if not container_id:
                raise NonRetryableError(
                    message=(
                        "PhantomBuster launch did not return a container_id."
                    )
                )

        return await workflow.step(
            function=phantombuster_fetch_output,
            function_input=PhantomBusterFetchOutputInput(
                container_id=container_id,
                phantom_id=workflow_input.phantom_id,
            ),
            task_queue="mcp_server",
            start_to_close_timeout=timedelta(seconds=90),
        )
