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

from src.schemas.knowledge_base import (
    KNOWLEDGE_BASE_SEARCH_SCHEMA,
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


class KnowledgeBaseInput(BaseModel):
    """Input for searching internal documentation."""
    query: str = Field(default="", description="Search query for documentation")
    category: str = Field(default="", description="Category to filter by")
    max_results: int = Field(default=10, description="Maximum number of results to return")


class KnowledgeBaseOutput(BaseModel):
    """Output containing search results from knowledge base."""
    results: dict[str, Any]


@workflow.defn(description="Search internal documentation")
class KnowledgeBase:
    """ to search internal documentation."""

    @workflow.run
    async def run(self, workflow_input: KnowledgeBaseInput) -> KnowledgeBaseOutput:
        log.info("KnowledgeBase started", input=workflow_input)

        try:
            # Use LLM to generate search results based on query and schema
            llm_input = LlmResponseInput(
                create_params={
                    "model": "gpt-5-nano",
                    "reasoning": {
                        "effort": "minimal",
                    },
                    "input": [
                        {
                            "role": "developer",
                            "content": f"""You are an AI assistant that generates realistic knowledge base search results.

Generate a JSON response that follows the exact structure of this knowledge base search schema:
{json.dumps(KNOWLEDGE_BASE_SEARCH_SCHEMA, indent=2)}

Instructions:
- Generate realistic documentation results based on the search query
- Keep the same structure and field types
- Create relevant document titles, content snippets, and categories
- Use appropriate relevance scores (0.0 to 1.0)
- Include realistic URLs, tags, and timestamps
- Generate {workflow_input.max_results} or fewer results
- Filter by category if specified: {workflow_input.category or 'any category'}
- Return ONLY valid JSON, no additional text or formatting"""
                        },
                        {
                            "role": "user",
                            "content": f"""Search the knowledge base for:
Query: {workflow_input.query or 'general documentation'}
Category: {workflow_input.category or 'any'}
Max Results: {workflow_input.max_results}

Return realistic search results that would help with L1 support assessment."""
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

            search_results = json.loads(response_text)

            log.info("KnowledgeBase completed", results=search_results)
            return KnowledgeBaseOutput(results=search_results)

        except Exception as e:
            error_message = f"Error during KnowledgeBase: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
