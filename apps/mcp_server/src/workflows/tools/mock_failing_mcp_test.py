import secrets
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)


# Helper functions for different types of MCP failures that will be caught by error handling
def _raise_timeout_error() -> None:
    """Simulate a timeout error that mimics MCP tool timeout."""
    error_message = (
        "MCP_TIMEOUT: Tool execution timed out after 30 seconds"
    )
    raise NonRetryableError(error_message)


def _raise_invalid_params_error() -> None:
    """Simulate invalid parameters error."""
    error_message = "MCP_INVALID_PARAMS: Invalid parameters provided to MCP tool"
    raise NonRetryableError(error_message)


def _raise_tool_not_found_error() -> None:
    """Simulate tool not found error."""
    error_message = (
        "MCP_TOOL_NOT_FOUND: MCP tool not found or not available"
    )
    raise NonRetryableError(error_message)


def _raise_permission_denied_error() -> None:
    """Simulate permission denied error."""
    error_message = "MCP_PERMISSION_DENIED: Permission denied - insufficient privileges to execute MCP tool"
    raise NonRetryableError(error_message)


def _raise_network_error() -> None:
    """Simulate network connectivity error."""
    error_message = "MCP_NETWORK_ERROR: Network error - unable to connect to MCP server"
    raise NonRetryableError(error_message)


def _raise_json_parse_error() -> None:
    """Simulate JSON parsing error."""
    error_message = "MCP_JSON_PARSE_ERROR: Failed to parse MCP tool response - invalid JSON"
    raise NonRetryableError(error_message)


def _raise_workflow_error() -> None:
    """Simulate a workflow execution error."""
    error_message = "MCP_WORKFLOW_ERROR: Workflow execution failed due to internal constraints"
    raise NonRetryableError(error_message)


def _raise_activity_failure() -> None:
    """Simulate an activity failure."""
    error_message = "MCP_ACTIVITY_FAILURE: Activity failed to complete successfully"
    raise NonRetryableError(error_message)


def _raise_unknown_error(failure_type: str) -> None:
    """Raise error for unknown failure type."""
    error_message = f"MCP_UNKNOWN_ERROR: Unknown error type: {failure_type}"
    raise NonRetryableError(error_message)


def _get_random_failure_type() -> str:
    """Get a random failure type for testing."""
    failure_types = [
        "timeout",
        "invalid_params",
        "tool_not_found",
        "permission_denied",
        "network_error",
        "json_parse_error",
        "workflow_error",
        "activity_failure",
    ]
    return secrets.choice(failure_types)


def _execute_failure_type(failure_type: str) -> None:
    """Execute the specified failure type."""
    if failure_type == "timeout":
        _raise_timeout_error()
    elif failure_type == "invalid_params":
        _raise_invalid_params_error()
    elif failure_type == "tool_not_found":
        _raise_tool_not_found_error()
    elif failure_type == "permission_denied":
        _raise_permission_denied_error()
    elif failure_type == "network_error":
        _raise_network_error()
    elif failure_type == "json_parse_error":
        _raise_json_parse_error()
    elif failure_type == "workflow_error":
        _raise_workflow_error()
    elif failure_type == "activity_failure":
        _raise_activity_failure()
    else:
        # Default to a generic MCP error
        _raise_unknown_error(failure_type)


with import_functions():
    pass


class FailingMcpTestInput(BaseModel):
    """Input for the failing MCP test tool."""

    failure_type: str = Field(
        default="random",
        description="Type of failure to simulate (timeout, invalid_params, tool_not_found, permission_denied, network_error, json_parse_error, workflow_error, activity_failure, random)",
    )
    user_request: str = Field(
        default="Test request", description="User's test request"
    )
    should_fail: bool = Field(
        default=True,
        description="Whether the tool should fail or succeed",
    )


class FailingMcpTestOutput(BaseModel):
    """Output from the failing MCP test tool."""

    result: dict[str, Any]
    failure_simulated: bool
    failure_type: str | None = None


@workflow.defn(
    description="Mock MCP tool that fails on purpose for testing error handling"
)
class MockFailingMcpTest:
    """Mock MCP tool designed to fail in various ways to test error handling."""

    @workflow.run
    async def run(
        self, workflow_input: FailingMcpTestInput
    ) -> FailingMcpTestOutput:
        log.info(
            "MockFailingMcpTest started", input=workflow_input
        )

        try:
            # If should_fail is False, return a successful response
            if not workflow_input.should_fail:
                success_result = {
                    "status": "success",
                    "message": "MCP tool executed successfully",
                    "user_request": workflow_input.user_request,
                    "timestamp": "2024-01-01T12:00:00Z",
                }

                log.info(
                    "MockFailingMcpTest completed successfully",
                    result=success_result,
                )
                return FailingMcpTestOutput(
                    result=success_result,
                    failure_simulated=False,
                )

            # Determine failure type
            failure_type = workflow_input.failure_type
            if failure_type == "random":
                failure_type = _get_random_failure_type()

            log.info(f"Simulating {failure_type} failure")

            # Execute the specified failure type
            _execute_failure_type(failure_type)

        except Exception as e:
            error_message = f"MockFailingMcpTest simulated error ({failure_type}): {e}"
            log.error(error_message)

            # Re-raise as NonRetryableError to simulate MCP tool failure
            raise NonRetryableError(error_message) from e
