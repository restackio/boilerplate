import json
from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

from src.schemas.pagerduty_incident import (
    PAGERDUTY_INCIDENT_SCHEMA,
)


# Helper functions for error handling
def _raise_no_llm_response() -> None:
    """Raise an error when LLM returns no response."""
    error_message = "No text response from LLM"
    raise NonRetryableError(error_message)


with import_functions():
    from src.functions.llm_response import (
        LlmResponseInput,
        llm_response,
    )


class PagerDutyIncidentInput(BaseModel):
    """Input for retrieving PagerDuty incident information."""

    incident_id: str = Field(
        default="", description="ID of the incident to retrieve"
    )
    service_name: str = Field(
        default="", description="Name of the service"
    )
    status: str = Field(
        default="triggered", description="Status of the incident"
    )
    urgency: str = Field(
        default="high",
        description="Urgency level of the incident",
    )


class PagerDutyIncidentOutput(BaseModel):
    """Output containing PagerDuty incident details."""

    incident: dict[str, Any]


@workflow.defn(
    description="Mock PagerDuty incident information retrieval"
)
class MockPagerDutyIncident:
    """Mock tool to retrieve PagerDuty incident information using LLM-generated data."""

    @workflow.run
    async def run(
        self, workflow_input: PagerDutyIncidentInput
    ) -> PagerDutyIncidentOutput:
        log.info(
            "MockPagerDutyIncident started", input=workflow_input
        )

        try:
            # Use LLM to generate incident data based on input and schema
            llm_input = LlmResponseInput(
                create_params={
                    "model": "gpt-5-nano",
                    "reasoning": {
                        "effort": "minimal",
                    },
                    "input": [
                        {
                            "role": "developer",
                            "content": f"""You are an AI assistant that generates realistic PagerDuty incident JSON responses.

Generate a JSON response that follows the exact structure of this PagerDuty API schema:
{json.dumps(PAGERDUTY_INCIDENT_SCHEMA, indent=2)}

Instructions:
- Generate realistic values for all fields based on the input parameters
- Keep the same structure and field types
- Use appropriate IDs, timestamps, and other realistic data
- Make the incident details relevant to the service and status specified
- Set urgency and status based on input parameters
- Include realistic team assignments and escalation policies
- Return ONLY valid JSON, no additional text or formatting""",
                        },
                        {
                            "role": "user",
                            "content": f"""Generate a PagerDuty incident with these parameters:
Incident ID: {workflow_input.incident_id or 'auto-generate'}
Service: {workflow_input.service_name or 'Production Service'}
Status: {workflow_input.status}
Urgency: {workflow_input.urgency}

Return the complete JSON structure following the PagerDuty API format.""",
                        },
                    ],
                },
                stream=False,
            )

            response_text = await workflow.step(
                task_queue="mcp_server",
                function=llm_response,
                function_input=llm_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not response_text:
                _raise_no_llm_response()

            incident_data = json.loads(response_text)

            log.info(
                "MockPagerDutyIncident completed",
                incident=incident_data,
            )
            return PagerDutyIncidentOutput(incident=incident_data)

        except Exception as e:
            error_message = (
                f"Error during MockPagerDutyIncident: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
