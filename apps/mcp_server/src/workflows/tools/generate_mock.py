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

    response: dict[str, Any] | list[dict[str, Any]]
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
        log.info("GenerateMock started", input=workflow_input)

        try:
            # Step 1: Load the integration template
            template = await workflow.step(
                task_queue="mcp_server",
                function=template_from_sample,
                function_input=LoadTemplateInput(
                    integration_template=workflow_input.integration_template
                ),
                start_to_close_timeout=timedelta(seconds=20),
            )

            # Extract template configuration
            model = template.model
            system_prompt = template.system_prompt
            user_prompt_template = template.user_prompt_template

            # Format the user prompt with the provided parameters
            # Convert parameters dict to a formatted string for the template
            parameters_str = (
                json.dumps(workflow_input.parameters, indent=2)
                if workflow_input.parameters
                else "No specific parameters provided"
            )
            user_prompt = user_prompt_template.format(
                parameters=parameters_str
            )

            # Prepare LLM input based on model type
            if model == "gpt-4o-mini":
                # Use legacy format for gpt-4o-mini
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
                        "temperature": 0.1,
                        "max_tokens": 2000,
                    }
                )
            else:
                # Use new format for gpt-5-nano and other models
                llm_input = LlmResponseInput(
                    create_params={
                        "model": model,
                        "reasoning": {"effort": "minimal"},
                        "input": [
                            {
                                "role": "developer",
                                "content": system_prompt,
                            },
                            {
                                "role": "user",
                                "content": user_prompt,
                            },
                        ],
                    },
                    stream=False,
                )

            # Step 2: Call LLM to generate mock data
            response_text = await workflow.step(
                task_queue="mcp_server",
                function=llm_response,
                function_input=llm_input,
                start_to_close_timeout=timedelta(seconds=120),
            )

            if not response_text:
                _raise_no_llm_response()

            # Parse the response
            mock_data = json.loads(response_text)

            log.info(
                "GenerateMock completed",
                integration_template=workflow_input.integration_template,
                response=mock_data,
            )

            return GenerateMockOutput(
                response=mock_data,
                integration_type=workflow_input.integration_template,
            )

        except Exception as e:
            error_message = f"Error during GenerateMock: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
