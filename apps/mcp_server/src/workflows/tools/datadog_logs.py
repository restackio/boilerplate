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

from src.schemas.datadog_logs import DATADOG_LOGS_SCHEMA


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


class DatadogLogsInput(BaseModel):
    """Input for retrieving Datadog logs."""
    query: str = Field(default="", description="Search query for logs")
    service: str = Field(default="", description="Service name to filter by")
    status: str = Field(default="", description="Log status to filter by")
    from_time: str = Field(default="", description="Start time for log search")
    to_time: str = Field(default="", description="End time for log search")
    limit: int = Field(default=50, description="Maximum number of log entries to return")


class DatadogLogsOutput(BaseModel):
    """Output containing Datadog logs search results."""
    logs: dict[str, Any]


@workflow.defn()
class DatadogLogs:
    """ to retrieve Datadog logs using AI."""

    @workflow.run
    async def run(self, workflow_input: DatadogLogsInput) -> DatadogLogsOutput:
        log.info("DatadogLogs started", input=workflow_input)

        try:
            # Use LLM to generate log data based on input and schema
            llm_input = LlmResponseInput(
                create_params={
                    "model": "gpt-5-nano",
                    "reasoning": {
                        "effort": "minimal",
                    },
                    "input": [
                        {
                            "role": "developer",
                            "content": f"""You are an AI assistant that generates realistic Datadog logs JSON responses.

Generate a JSON response that follows the exact structure of this Datadog Logs API schema:
{json.dumps(DATADOG_LOGS_SCHEMA, indent=2)}

Instructions:
- Generate realistic log entries based on the search query and parameters
- Keep the same structure and field types
- Use appropriate timestamps, service names, and log levels
- Create relevant error messages and stack traces for error logs
- Include realistic tags, attributes, and metadata
- Generate up to {workflow_input.limit} log entries
- Filter by service if specified: {workflow_input.service or 'any service'}
- Filter by status if specified: {workflow_input.status or 'any status'}
- Return ONLY valid JSON, no additional text or formatting"""
                        },
                        {
                            "role": "user",
                            "content": f"""Search Datadog logs with these parameters:
Query: {workflow_input.query or 'error logs'}
Service: {workflow_input.service or 'any'}
Status: {workflow_input.status or 'any'}
Time Range: {workflow_input.from_time or 'last hour'} to {workflow_input.to_time or 'now'}
Limit: {workflow_input.limit}

Return relevant log entries that would help with L2 investigation."""
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
                _raise_no_llm_response()

            logs_data = json.loads(response_text)

            log.info("DatadogLogs completed", logs=logs_data)
            return DatadogLogsOutput(logs=logs_data)

        except Exception as e:
            error_message = f"Error during DatadogLogs: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
