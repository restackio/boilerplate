"""MCP tool for transforming data using AI with structured output."""

import json
from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field, field_validator
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)


class TransformDataInput(BaseModel):
    """Input for transforming data using AI."""

    data: list[dict[str, Any] | str] = Field(
        ...,
        description="Input data to transform (can be objects or JSON strings)",
    )
    prompt: str = Field(
        ..., description="Transformation prompt/instructions"
    )
    output_schema: dict[str, Any] = Field(
        ..., description="JSON schema for structured output"
    )
    model: str = Field(
        default="gpt-4o-mini",
        description="AI model to use for transformation",
    )

    @field_validator("data")
    @classmethod
    def parse_data(
        cls, v: list[dict[str, Any] | str]
    ) -> list[dict[str, Any]]:
        """Parse data items, converting JSON strings to dictionaries if needed."""
        parsed_data = []
        for item in v:
            if isinstance(item, str):
                try:
                    parsed_item = json.loads(item)
                    parsed_data.append(parsed_item)
                except json.JSONDecodeError as e:
                    error_message = f"Invalid JSON string in data: {item[:100]}..."
                    raise ValueError(error_message) from e
            elif isinstance(item, dict):
                parsed_data.append(item)
            else:
                error_message = f"Data item must be a dictionary or JSON string, got {type(item)}"
                raise TypeError(error_message)
        return parsed_data


class TransformDataOutput(BaseModel):
    """Output after transforming data."""

    success: bool = Field(
        ..., description="True if transformation was successful"
    )
    transformed_data: list[dict[str, Any]] = Field(
        ..., description="Transformed data records"
    )
    message: str = Field(
        ..., description="Details about the transformation"
    )


# Import the llm_response function
with import_functions():
    from src.functions.llm_response import (
        LlmResponseInput,
        llm_response,
    )


@workflow.defn(
    description="Transform data using AI with structured output"
)
class TransformData:
    """Workflow to transform data using AI with a custom prompt and structured output schema."""

    @workflow.run
    async def run(
        self, workflow_input: TransformDataInput
    ) -> TransformDataOutput:
        """Transform data using AI."""
        log.info("TransformData started", input=workflow_input)

        try:
            # Prepare the system prompt for transformation
            system_prompt = f"""You are a data transformation assistant. Transform the provided data according to the user's instructions.

Instructions: {workflow_input.prompt}

You must return the transformed data as a JSON array where each item follows this schema:
{json.dumps(workflow_input.output_schema, indent=2)}

Return ONLY the JSON array, no additional text or formatting."""

            # Prepare the user message with the input data
            user_message = f"Transform this data:\n{json.dumps(workflow_input.data, indent=2)}"

            # Prepare the LLM request parameters
            create_params = {
                "model": workflow_input.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": 0.1,  # Low temperature for consistent transformations
                "max_tokens": 4000,
            }

            # Call the LLM function using workflow.step
            llm_input = LlmResponseInput(
                create_params=create_params
            )

            response = await workflow.step(
                task_queue="mcp_server",
                function=llm_response,
                function_input=llm_input,
                start_to_close_timeout=timedelta(seconds=120),
            )

            # Parse the response as JSON
            try:
                transformed_data = json.loads(response.strip())

                # Ensure it's a list
                if not isinstance(transformed_data, list):
                    transformed_data = [transformed_data]

                result = TransformDataOutput(
                    success=True,
                    transformed_data=transformed_data,
                    message=f"Successfully transformed {len(workflow_input.data)} records into {len(transformed_data)} records",
                )

                log.info(
                    "TransformData completed successfully",
                    transformed_count=len(
                        result.transformed_data
                    ),
                )
            except json.JSONDecodeError as e:
                error_message = f"Failed to parse LLM response as JSON: {e}. Response: {response[:500]}"
                log.error(error_message)
                raise NonRetryableError(error_message) from e
            else:
                return result

        except Exception as e:
            error_message = f"TransformData failed: {e}"
            log.error(error_message)
            raise NonRetryableError(error_message) from e
