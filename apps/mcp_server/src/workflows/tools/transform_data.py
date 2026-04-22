"""MCP tool for transforming data using AI with structured output."""

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


class TransformDataInput(BaseModel):
    """Transform data using AI with structured output.

    Three separate required parameters:
    - input_data: The actual data object to analyze
    - transformation_task: What analysis to perform
    - output_schema: JSON Schema for the result
    """

    input_data: list[dict[str, Any]] = Field(
        ...,
        description="The actual data object to analyze. Put the raw data here. Example: [{'integration_type': 'zendesk_ticket', 'response': {'ticket': {...}}}]",
    )
    transformation_task: str = Field(
        ...,
        description="The analysis or transformation task to perform. Example: 'Assess ticket urgency based on severity and impact'",
    )
    output_schema: dict = Field(
        ...,
        description=(
            "JSON Schema for the output. Must have 'type' and 'properties'. "
            "Example: {'type': 'object', 'properties': {'urgency_level': {'type': 'string'}}}"
        ),
    )
    model: str = Field(
        default="gpt-5-mini",
        description="AI model to use for transformation",
    )


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


def _make_schema_strict(schema: Any) -> Any:
    """Recursively make a JSON schema compatible with OpenAI strict structured outputs.

    OpenAI strict mode requires, for every object schema:
      - `additionalProperties: false`
      - `required` listing every key in `properties`

    The user passes an arbitrary `output_schema` through `TransformData`, so we can't
    assume it's strict-compliant. This walks the tree and patches every object node,
    and recurses into `items`, `properties.*`, `oneOf`/`anyOf`/`allOf` branches, and
    `$defs`/`definitions` so nested schemas are also normalized.
    """
    if isinstance(schema, dict):
        patched: dict[str, Any] = {}
        for key, value in schema.items():
            patched[key] = _make_schema_strict(value)

        if patched.get("type") == "object" or "properties" in patched:
            patched.setdefault("additionalProperties", False)
            props = patched.get("properties")
            if isinstance(props, dict):
                existing_required = patched.get("required")
                if not isinstance(existing_required, list):
                    patched["required"] = list(props.keys())
                else:
                    missing = [
                        k for k in props.keys() if k not in existing_required
                    ]
                    if missing:
                        patched["required"] = [*existing_required, *missing]
        return patched

    if isinstance(schema, list):
        return [_make_schema_strict(item) for item in schema]

    return schema


@workflow.defn(
    mcp=True,
    description="Transform data using AI with structured output",
)
class TransformData:
    """Workflow to transform data using AI with a custom prompt and structured output schema."""

    @workflow.run
    async def run(
        self, workflow_input: TransformDataInput
    ) -> TransformDataOutput:
        """Transform data using AI."""
        log.info(
            "TransformData started",
            model=workflow_input.model,
            input_data_count=len(workflow_input.input_data),
            transformation_task=workflow_input.transformation_task[
                :100
            ],  # First 100 chars
        )

        try:
            # Prepare concise prompts - structured outputs enforce schema
            system_prompt = f"""Transform the provided data according to these instructions:

{workflow_input.transformation_task}"""

            user_message = f"Data to transform:\n{json.dumps(workflow_input.input_data, indent=2)}"

            # Create structured output schema (array of items matching output_schema).
            # Normalize the user-supplied output_schema so every nested object has
            # `additionalProperties: false` and a complete `required` list, which
            # OpenAI strict mode mandates. Without this, a schema like
            # `{type: object, properties: {foo: {type: string}}}` is rejected with
            # "additionalProperties is required to be supplied and to be false".
            normalized_item_schema = _make_schema_strict(
                workflow_input.output_schema
            )
            array_schema = {
                "type": "object",
                "properties": {
                    "results": {
                        "type": "array",
                        "items": normalized_item_schema,
                    }
                },
                "required": ["results"],
                "additionalProperties": False,
            }

            # Prepare the LLM request parameters with structured outputs
            create_params = {
                "model": workflow_input.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "transform_result",
                        "strict": True,
                        "schema": array_schema,
                    },
                },
            }

            # Call the LLM function using workflow.step
            llm_input = LlmResponseInput(
                create_params=create_params
            )

            response = await workflow.step(
                task_queue="mcp_server",
                function=llm_response,
                function_input=llm_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            # Parse the response as JSON
            try:
                response_data = json.loads(response.strip())
                transformed_data = response_data.get(
                    "results", []
                )

                result = TransformDataOutput(
                    success=True,
                    transformed_data=transformed_data,
                    message=f"Successfully transformed data into {len(transformed_data)} record(s)",
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
            log.error(
                "TransformData failed",
                error_message=error_message,
                error_type=type(e).__name__,
                model=workflow_input.model,
            )
            raise NonRetryableError(error_message) from e
