import json
from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    RetryPolicy,
    import_functions,
    log,
    workflow,
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
    from src.functions.template_from_sample import (
        LoadTemplateInput,
        template_from_sample,
    )


class GenerateMockInput(BaseModel):
    """Input for generating mock data for any integration."""

    integration_template: str = Field(
        description="The integration template to use (e.g., 'zendesk_ticket', 'github_pr', 'datadog_logs')"
    )
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters specific to the integration template",
    )


class GenerateMockOutput(BaseModel):
    """Output containing the generated mock integration response."""

    response: Any = Field(
        ..., description="Generated mock data (object or array)"
    )
    integration_type: str


@workflow.defn(
    description="Generate mock data for any integration"
)
class GenerateMock:
    """Generate mock data for any integration using templates."""

    @workflow.run
    async def run(
        self, workflow_input: GenerateMockInput
    ) -> GenerateMockOutput:
        log.info(
            "GenerateMock started",
            integration_template=workflow_input.integration_template,
            parameters=workflow_input.parameters,
        )

        try:
            # Step 1: Load the integration template
            template = await workflow.step(
                task_queue="mcp_server",
                function=template_from_sample,
                function_input=LoadTemplateInput(
                    integration_template=workflow_input.integration_template
                ),
                start_to_close_timeout=timedelta(seconds=5),
            )

            # Extract template configuration
            model = template.model
            system_prompt = template.system_prompt
            user_prompt_template = template.user_prompt_template
            json_schema = template.json_schema

            log.info(
                "Template loaded",
                model=model,
                schema_size=len(str(json_schema)),
            )

            # Format the user prompt with the provided parameters
            parameters_str = (
                json.dumps(workflow_input.parameters, indent=2)
                if workflow_input.parameters
                else "No specific parameters provided"
            )
            user_prompt = user_prompt_template.format(
                parameters=parameters_str
            )

            # Prepare LLM input with structured outputs for fast, reliable JSON
            llm_input = LlmResponseInput(
                create_params={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": system_prompt,
                        },
                        {
                            "role": "user",
                            "content": user_prompt,
                        },
                    ],
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "mock_data",
                            "strict": True,
                            "schema": json_schema,
                        },
                    },
                }
            )

            # Step 2: Call LLM to generate mock data
            response_text = await workflow.step(
                task_queue="mcp_server",
                function=llm_response,
                function_input=llm_input,
                start_to_close_timeout=timedelta(seconds=120),
                retry_policy=RetryPolicy(
                    maximum_attempts=1,
                ),
            )

            if not response_text:
                _raise_no_llm_response()

            # Parse the response
            mock_data = json.loads(response_text)

            log.info(
                "GenerateMock completed",
                integration_template=workflow_input.integration_template,
                response_size=len(str(mock_data)),
                response_keys=list(mock_data.keys())
                if isinstance(mock_data, dict)
                else "array",
            )

            return GenerateMockOutput(
                response=mock_data,
                integration_type=workflow_input.integration_template,
            )

        except Exception as e:
            error_message = f"Error during GenerateMock: {e}"
            log.error(
                "GenerateMock failed",
                error_message=error_message,
                error_type=type(e).__name__,
                integration_template=workflow_input.integration_template,
            )
            raise NonRetryableError(message=error_message) from e
