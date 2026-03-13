"""Workflow to read the curated remote MCP directory (for frontend and build agent)."""

from datetime import timedelta

from restack_ai.workflow import NonRetryableError, log, workflow

from src.constants import TASK_QUEUE
from src.functions.remote_mcp_directory import (
    RemoteMcpDirectoryInput,
    RemoteMcpDirectoryOutput,
    remote_mcp_directory_read,
)


@workflow.defn()
class GetRemoteMcpDirectoryWorkflow:
    """Workflow to get curated remote MCP directory entries, optionally filtered by query."""

    @workflow.run
    async def run(
        self, workflow_input: RemoteMcpDirectoryInput
    ) -> RemoteMcpDirectoryOutput:
        log.info("GetRemoteMcpDirectoryWorkflow started")
        try:
            return await workflow.step(
                function=remote_mcp_directory_read,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
            ConnectionError,
            OSError,
        ) as e:
            error_message = (
                f"Error during remote_mcp_directory_read: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
