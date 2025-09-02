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

from src.schemas.github_pr import GITHUB_PR_CREATION_SCHEMA


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


class GitHubPRInput(BaseModel):
    """Input for creating a GitHub Pull Request."""
    title: str = Field(default="", description="Title of the pull request")
    body: str = Field(default="", description="Description of the pull request")
    head_branch: str = Field(default="", description="Source branch for the PR")
    base_branch: str = Field(default="main", description="Target branch for the PR")
    repository: str = Field(default="company/service", description="Repository name")
    assignee: str = Field(default="", description="Assignee username")
    reviewers: list[str] = Field(default_factory=list, description="List of reviewer usernames")
    labels: list[str] = Field(default_factory=list, description="List of labels to apply")
    milestone: str = Field(default="", description="Milestone name")
    draft: bool = Field(default=False, description="Whether this is a draft PR")


class GitHubPROutput(BaseModel):
    """Output containing the created GitHub PR details."""
    pull_request: dict[str, Any]


@workflow.defn(description="Create a GitHub Pull Request")
class GitHubPR:
    """ to create a GitHub Pull Request."""

    @workflow.run
    async def run(self, workflow_input: GitHubPRInput) -> GitHubPROutput:
        log.info("GitHubPR started", input=workflow_input)

        try:
            # Use LLM to generate PR data based on input and schema
            llm_input = LlmResponseInput(
                create_params={
                    "model": "gpt-5-nano",
                    "reasoning": {
                        "effort": "minimal",
                    },
                    "input": [
                        {
                            "role": "developer",
                            "content": f"""You are an AI assistant that generates realistic GitHub Pull Request creation JSON responses.

Generate a JSON response that follows the exact structure of this GitHub API schema:
{json.dumps(GITHUB_PR_CREATION_SCHEMA, indent=2)}

Instructions:
- Generate realistic values for all fields based on the input parameters
- Keep the same structure and field types
- Use appropriate IDs, timestamps, and other realistic data
- Make sure title and body match the input
- Set head and base branches correctly
- Generate appropriate user, assignee, and reviewer information
- Create realistic labels, milestone, and repository data
- Set draft status based on input
- Include realistic URLs and commit information
- Return ONLY valid JSON, no additional text or formatting"""
                        },
                        {
                            "role": "user",
                            "content": f"""Create a GitHub Pull Request with these details:
Title: {workflow_input.title or 'Fix database connection issue'}
Body: {workflow_input.body or 'Resolves connection timeout in production database'}
Head Branch: {workflow_input.head_branch or 'fix/db-connection'}
Base Branch: {workflow_input.base_branch}
Repository: {workflow_input.repository}
Assignee: {workflow_input.assignee or 'auto-assign'}
Reviewers: {workflow_input.reviewers or ['senior-dev']}
Labels: {workflow_input.labels or ['bug', 'database']}
Milestone: {workflow_input.milestone or 'Q1 Infrastructure'}
Draft: {workflow_input.draft}

Return the complete JSON structure following the GitHub API format."""
                        }
                    ],
                },
                stream=False
            )

            response_text = await workflow.step(
                task_queue="mcp_server",
                function=llm_response,
                function_input=llm_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            if not response_text:
                _raise_no_llm_response()

            pr_data = json.loads(response_text)

            log.info("GitHubPR completed", pr=pr_data)
            return GitHubPROutput(pull_request=pr_data)

        except Exception as e:
            error_message = f"Error during GitHubPR: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
