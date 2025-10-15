"""Function to load integration templates from sample data for mock data generation."""

from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import function, log

from src.functions.mock_samples.datadog_logs import (
    DATADOG_LOGS_SAMPLE,
)
from src.functions.mock_samples.github_pr import (
    GITHUB_PR_CREATION_SAMPLE,
)
from src.functions.mock_samples.hello_world import (
    HELLO_WORLD_SAMPLE,
)
from src.functions.mock_samples.kaiser_policy import (
    KAISER_POLICY_SAMPLE,
)
from src.functions.mock_samples.knowledge_base import (
    KNOWLEDGE_BASE_SEARCH_SAMPLE,
)
from src.functions.mock_samples.linear_issue import (
    LINEAR_ISSUE_CREATION_SAMPLE,
)
from src.functions.mock_samples.linkedin_profiles_post import (
    LINKEDIN_PROFILES_POST_SAMPLE,
)
from src.functions.mock_samples.pagerduty_incident import (
    PAGERDUTY_INCIDENT_SAMPLE,
)
from src.functions.mock_samples.zendesk_ticket import (
    ZENDESK_TICKET_SAMPLE,
)


def json_to_schema(  # noqa: PLR0911
    obj: Any,
    name: str = "Response",  # noqa: ARG001
) -> dict[str, Any]:
    """Convert a sample JSON object to a JSON schema for structured outputs."""
    if isinstance(obj, dict):
        properties = {}
        required = []
        for key, value in obj.items():
            properties[key] = json_to_schema(value, key)
            required.append(key)
        return {
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": False,
        }
    if isinstance(obj, list):
        if obj:
            return {
                "type": "array",
                "items": json_to_schema(obj[0], "item"),
            }
        # Empty arrays need a default items schema for OpenAI strict mode
        return {
            "type": "array",
            "items": {
                "type": "string"
            },  # Default to string for empty arrays
        }
    if isinstance(obj, bool):
        return {"type": "boolean"}
    if isinstance(obj, int):
        return {"type": "integer"}
    if isinstance(obj, float):
        return {"type": "number"}
    if isinstance(obj, str):
        return {"type": "string"}
    if obj is None:
        return {"type": "null"}
    return {"type": "string"}


def create_template(
    sample: dict[str, Any], model: str = "gpt-5-nano"
) -> dict[str, Any]:
    """Create a standardized integration template with structured outputs."""
    # Generate JSON schema from sample for structured outputs
    schema = json_to_schema(sample, "MockData")

    # Concise prompt - structured outputs handle the structure
    system_prompt = """Generate realistic mock data based on the user's parameters. Use appropriate realistic values for IDs, timestamps, names, and other fields."""

    user_prompt = """Generate mock data with these parameters:
{parameters}"""

    return {
        "sample": sample,
        "model": model,
        "system_prompt": system_prompt,
        "user_prompt_template": user_prompt,
        "json_schema": schema,  # For structured outputs
    }


# Sample configurations - just specify sample data and model
TEMPLATE_CONFIGS = {
    "zendesk_ticket": {"sample": ZENDESK_TICKET_SAMPLE},
    "github_pr": {"sample": GITHUB_PR_CREATION_SAMPLE},
    "datadog_logs": {"sample": DATADOG_LOGS_SAMPLE},
    "knowledge_base": {"sample": KNOWLEDGE_BASE_SEARCH_SAMPLE},
    "linear_issue": {"sample": LINEAR_ISSUE_CREATION_SAMPLE},
    "pagerduty_incident": {"sample": PAGERDUTY_INCIDENT_SAMPLE},
    "hello_world": {"sample": HELLO_WORLD_SAMPLE},
    "linkedin_profiles_post": {
        "sample": LINKEDIN_PROFILES_POST_SAMPLE
    },
    "kaiser_policy": {"sample": KAISER_POLICY_SAMPLE},
}

# Generate the integration templates using the factory function
INTEGRATION_TEMPLATES = {
    template_name: create_template(**config)
    for template_name, config in TEMPLATE_CONFIGS.items()
}


class LoadTemplateInput(BaseModel):
    """Input for loading an integration template."""

    integration_template: str = Field(
        description="The integration template to load (e.g., 'zendesk_ticket', 'github_pr', 'datadog_logs')"
    )


class LoadTemplateOutput(BaseModel):
    """Output containing the loaded integration template."""

    sample: dict[str, Any]
    model: str
    system_prompt: str
    user_prompt_template: str
    integration_type: str
    json_schema: dict[str, Any]


@function.defn(name="template_from_sample")
async def template_from_sample(
    input_data: LoadTemplateInput,
) -> LoadTemplateOutput:
    """Load an integration template configuration from sample data."""
    template = INTEGRATION_TEMPLATES.get(
        input_data.integration_template
    )
    if not template:
        available_templates = list(INTEGRATION_TEMPLATES.keys())
        error_message = (
            f"Unknown integration template: {input_data.integration_template}. "
            f"Available templates: {available_templates}"
        )
        log.error(
            "Template not found",
            requested_template=input_data.integration_template,
            available_templates=available_templates,
        )
        raise ValueError(error_message)

    log.info(
        "Template loaded",
        integration_template=input_data.integration_template,
        model=template.get("model", "gpt-5-nano"),
        prompt_size=len(template["system_prompt"]),
        schema_properties=len(
            template["json_schema"].get("properties", {})
        ),
    )

    return LoadTemplateOutput(
        sample=template["sample"],
        model=template.get("model", "gpt-5-nano"),
        system_prompt=template["system_prompt"],
        user_prompt_template=template["user_prompt_template"],
        integration_type=input_data.integration_template,
        json_schema=template["json_schema"],
    )
