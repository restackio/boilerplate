"""Function to load integration templates from sample data for mock data generation."""

import json
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.function import function

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


def create_template(
    sample: dict[str, Any], model: str = "gpt-5-nano"
) -> dict[str, Any]:
    """Create a standardized integration template."""
    system_prompt = f"""You are an AI assistant that generates realistic mock data following the provided sample structure.

Generate a JSON response that follows the exact structure of this sample data:
{json.dumps(sample, indent=2)}

Instructions:
- Generate realistic values for all fields based on the input parameters
- Keep the same structure and field types as the sample
- Use appropriate IDs, timestamps, and other realistic data
- Make the data relevant to the context provided in the user request
- Return ONLY valid JSON, no additional text or formatting"""

    user_prompt = """Generate mock data based on these parameters:
{parameters}

Create realistic data that follows the sample structure and is relevant to the provided context."""

    return {
        "sample": sample,
        "model": model,
        "system_prompt": system_prompt,
        "user_prompt_template": user_prompt,
    }


# Sample configurations - just specify sample data and model
TEMPLATE_CONFIGS = {
    "zendesk_ticket": {
        "sample": ZENDESK_TICKET_SAMPLE,
        "model": "gpt-4o-mini",
    },
    "github_pr": {"sample": GITHUB_PR_CREATION_SAMPLE},
    "datadog_logs": {"sample": DATADOG_LOGS_SAMPLE},
    "knowledge_base": {"sample": KNOWLEDGE_BASE_SEARCH_SAMPLE},
    "linear_issue": {"sample": LINEAR_ISSUE_CREATION_SAMPLE},
    "pagerduty_incident": {"sample": PAGERDUTY_INCIDENT_SAMPLE},
    "hello_world": {"sample": HELLO_WORLD_SAMPLE},
    "linkedin_profiles_post": {
        "sample": LINKEDIN_PROFILES_POST_SAMPLE
    },
    "kaiser_policy": {
        "sample": KAISER_POLICY_SAMPLE,
        "model": "gpt-4o-mini",
    },
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
        raise ValueError(error_message)

    return LoadTemplateOutput(
        sample=template["sample"],
        model=template.get("model", "gpt-5-nano"),
        system_prompt=template["system_prompt"],
        user_prompt_template=template["user_prompt_template"],
        integration_type=input_data.integration_template,
    )
