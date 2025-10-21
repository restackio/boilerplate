"""Update todos workflow for MCP tool."""

from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.update_todos import (
        UpdateTodosFunctionInput,
        UpdateTodosFunctionOutput,
        update_todos,
    )


@workflow.defn(
    description="Track multi-step task progress. Send full todo list each call: [{id, content, status: 'pending'|'in_progress'|'completed'}]. Add by including, complete by changing status, remove by excluding."
)
class UpdateTodos:
    """MCP workflow to update task todos in agent state."""

    @workflow.run
    async def run(
        self, workflow_input: UpdateTodosFunctionInput
    ) -> UpdateTodosFunctionOutput:
        """Execute the update todos function.

        This workflow wraps the update_todos function to make it available as an MCP tool.
        The function sends events to the agent to update its todo state.
        LLM provides temporal_agent_id and temporal_run_id in the input.
        """
        log.info(
            f"UpdateTodos workflow started with {len(workflow_input.todos)} todos"
        )
        try:
            return await workflow.step(
                task_queue="mcp_server",
                function=update_todos,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during update_todos: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
