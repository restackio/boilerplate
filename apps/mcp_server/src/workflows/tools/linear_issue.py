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

from src.schemas.linear_issue import LINEAR_ISSUE_CREATION_SCHEMA


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


class LinearIssueInput(BaseModel):
    """Input for creating a Linear issue."""
    title: str = Field(default="", description="Title of the Linear issue")
    description: str = Field(default="", description="Description of the Linear issue")
    priority: int = Field(default=2, description="Priority level (1=urgent, 2=high, 3=normal, 4=low)")
    team_key: str = Field(default="ENG", description="Team key for assignment")
    assignee_email: str = Field(default="", description="Email of the assignee")
    labels: list[str] = Field(default_factory=list, description="List of labels to apply")
    project_name: str = Field(default="General", description="Name of the project")


class LinearIssueOutput(BaseModel):
    """Output containing the created Linear issue details."""
    issue: dict[str, Any]


@workflow.defn()
class LinearIssue:
    """ to create a Linear issue using AI."""

    @workflow.run
    async def run(self, workflow_input: LinearIssueInput) -> LinearIssueOutput:
        log.info("LinearIssue started", input=workflow_input)

        try:
            # Use LLM to generate issue data based on input and schema
            llm_input = LlmResponseInput(
                create_params={
                    "model": "gpt-5-nano",
                    "reasoning": {
                        "effort": "minimal",
                    },
                    "input": [
                        {
                            "role": "developer",
                            "content": f"""You are an AI assistant that generates realistic Linear issue creation JSON responses.

Generate a JSON response that follows the exact structure of this Linear API schema:
{json.dumps(LINEAR_ISSUE_CREATION_SCHEMA, indent=2)}

Instructions:
- Generate realistic values for all fields based on the input parameters
- Keep the same structure and field types
- Use appropriate IDs, timestamps, and other realistic data
- Make sure title and description match the input
- Set priority based on input (1=urgent, 2=high, 3=normal, 4=low)
- Generate appropriate team, assignee, and label information
- Create realistic URLs and identifiers
- Set due date appropriately based on priority
- Return ONLY valid JSON, no additional text or formatting"""
                        },
                        {
                            "role": "user",
                            "content": f"""Create a Linear issue with these details:
Title: {workflow_input.title or 'Database performance degradation'}
Description: {workflow_input.description or 'Users reporting slow query responses in production'}
Priority: {workflow_input.priority} (1=urgent, 2=high, 3=normal, 4=low)
Team: {workflow_input.team_key}
Assignee: {workflow_input.assignee_email or 'auto-assign'}
Labels: {workflow_input.labels or ['bug', 'support']}
Project: {workflow_input.project_name}

Return the complete JSON structure following the Linear API format."""
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

            issue_data = json.loads(response_text)

            log.info("LinearIssue completed", issue=issue_data)
            return LinearIssueOutput(issue=issue_data)

        except Exception as e:
            error_message = f"Error during LinearIssue: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
