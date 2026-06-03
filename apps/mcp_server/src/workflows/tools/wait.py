"""Wait/sleep workflow exposed as an MCP tool for pacing agent polling loops."""

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    log,
    workflow,
)

# A single wait is capped well under OpenAI's MCP connector timeout (~60-120s)
# so this tool never triggers a 504 "Timed out waiting for MCP server response".
# To wait longer (e.g. several minutes), the agent calls this tool repeatedly.
MAX_WAIT_SECONDS = 50
DEFAULT_WAIT_SECONDS = 45


class WaitInput(BaseModel):
    """Input for the wait tool."""

    seconds: int = Field(
        default=DEFAULT_WAIT_SECONDS,
        description=(
            f"Number of seconds to pause before returning. Values are clamped to "
            f"1-{MAX_WAIT_SECONDS}s on purpose so a single call stays under the MCP "
            "response timeout. To wait several minutes, call this tool multiple times "
            "in a row (e.g. ~7 calls of 45s is roughly 5 minutes)."
        ),
    )


class WaitOutput(BaseModel):
    """Result from the wait tool."""

    status: str
    seconds_waited: int
    message: str


@workflow.defn(
    mcp=True,
    description="""Pause for a number of seconds before returning.

    Use this to space out repeated polling calls (e.g. checking a long-running job's
    status) so you don't call a status tool back-to-back. A single call is capped at
    50 seconds to stay safely under the MCP response timeout. To wait several minutes,
    call this tool multiple times in sequence between status checks (about 7 calls of
    45 seconds is roughly 5 minutes).

    Example: launch a job -> wait(45) repeated ~7 times -> check status -> if not
    finished, repeat the wait/check cycle.
    """,
)
class Wait:
    """Durable sleep exposed as an MCP tool for pacing agent polling."""

    @workflow.run
    async def run(self, workflow_input: WaitInput) -> WaitOutput:
        seconds = max(
            1, min(MAX_WAIT_SECONDS, workflow_input.seconds)
        )
        if seconds != workflow_input.seconds:
            log.info(
                "Wait tool clamped requested duration",
                requested=workflow_input.seconds,
                clamped_to=seconds,
            )

        log.info(f"Wait tool started: sleeping {seconds}s")
        try:
            await workflow.sleep(seconds)
        except Exception as e:
            error_message = f"Error during wait: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e

        return WaitOutput(
            status="completed",
            seconds_waited=seconds,
            message=f"Waited {seconds} seconds.",
        )
