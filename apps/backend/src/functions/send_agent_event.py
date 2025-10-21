from typing import Any

from pydantic import BaseModel
from restack_ai.function import NonRetryableError, function

from src.client import client


class SendAgentEventInput(BaseModel):
    event_name: str
    temporal_agent_id: str
    temporal_run_id: str | None = None
    event_input: dict[str, Any] | None = None
    wait_for_completion: bool = False


class SendAgentEventOutput(BaseModel):
    success: bool
    message: str


@function.defn()
async def send_agent_event(
    function_input: SendAgentEventInput,
) -> SendAgentEventOutput:
    try:
        await client.send_agent_event(
            event_name=function_input.event_name,
            agent_id=function_input.temporal_agent_id,
            run_id=function_input.temporal_run_id,
            event_input=function_input.event_input,
            wait_for_completion=function_input.wait_for_completion,
        )

        return SendAgentEventOutput(
            success=True,
            message=f"Event '{function_input.event_name}' sent successfully to temporal agent {function_input.temporal_agent_id}",
        )

    except Exception as e:
        msg = f"send_agent_event failed: {e}"
        raise NonRetryableError(msg) from e
