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

from src.schemas.zendesk_ticket import ZENDESK_TICKET_SCHEMA

with import_functions():
    from src.functions.llm_response import (
        LlmResponseInput,
        llm_response,
    )


class ZendeskTicketInput(BaseModel):
    """Input for generating a Zendesk ticket."""
    user_request: str = Field(default="", description="User's support request")
    priority: str = Field(default="normal", description="Priority level (low, normal, high, urgent)")
    ticket_type: str = Field(default="incident", description="Type of ticket (incident, question, task)")


class ZendeskTicketOutput(BaseModel):
    """Output containing the generated Zendesk ticket JSON."""
    ticket: dict[str, Any]

@workflow.defn()
class ZendeskTicketWorkflow:
    """Workflow to generate a mocked Zendesk ticket using AI."""

    @workflow.run
    async def run(self, workflow_input: ZendeskTicketInput) -> ZendeskTicketOutput:
        log.info("ZendeskTicketWorkflow started", input=workflow_input)

        try:
            # Use LLM to generate a ticket based on user request and schema
            llm_input = LlmResponseInput(
                create_params={
                    "model": "gpt-5-nano",
                    "reasoning": {
                        "effort": "minimal",
                    },
                    "input": [
                        {
                            "role": "developer",
                            "content": f"""You are an AI assistant that generates realistic Zendesk ticket JSON responses.

Generate a JSON response that follows the exact structure of this Zendesk API schema:
{json.dumps(ZENDESK_TICKET_SCHEMA, indent=2)}

Instructions:
- Generate realistic values for all fields based on the user request
- Keep the same structure and field types
- Use appropriate IDs, timestamps, and other realistic data
- Make sure the subject and description match the user's request
- Set priority and type based on the input parameters
- Return ONLY valid JSON, no additional text or formatting"""
                        },
                        {
                            "role": "user",
                            "content": f"""Generate a Zendesk ticket for this request:
User Request: {workflow_input.user_request or 'General support request'}
Priority: {workflow_input.priority}
Type: {workflow_input.ticket_type}

Return the complete JSON structure following the Zendesk API format."""
                        }
                    ],
                },
                stream=False
            )

            response_text = await workflow.step(
                function=llm_response,
                function_input=llm_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not response_text:
                raise NonRetryableError("No text response from LLM")
            
            generated_ticket = json.loads(response_text)

            log.info("ZendeskTicketWorkflow completed", ticket=generated_ticket)
            return ZendeskTicketOutput(ticket=generated_ticket)

        except Exception as e:
            error_message = f"Error during ZendeskTicketWorkflow: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
