import asyncio
from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    ParentClosePolicy,
    import_functions,
    log,
    workflow,
    workflow_info,
)

from src.agents.agent_task import AgentTask, AgentTaskInput

with import_functions():
    from src.functions.agents_crud import (
        AgentResolveInput,
        agents_resolve_by_name,
    )
    from src.functions.send_agent_event import (
        SendAgentEventInput,
        send_agent_event,
    )
    from src.functions.tasks_crud import (
        TaskCreateInput,
        TaskDeleteOutput,
        TaskGetByIdInput,
        TaskGetByStatusInput,
        TaskListOutput,
        TaskSingleOutput,
        TaskUpdateAgentTaskIdInput,
        TaskUpdateInput,
        tasks_create,
        tasks_delete,
        tasks_get_by_id,
        tasks_get_by_status,
        tasks_read,
        tasks_update,
        tasks_update_agent_task_id,
    )


# Workflow definitions
@workflow.defn()
class TasksReadWorkflow:
    """Workflow to read all tasks."""

    @workflow.run
    async def run(self, workflow_input: dict) -> TaskListOutput:
        log.info("TasksReadWorkflow started")
        try:
            return await workflow.step(
                function=tasks_read,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during tasks_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TasksCreateWorkflow:
    """Workflow to create a new task."""

    @workflow.run
    async def run(
        self, workflow_input: TaskCreateInput
    ) -> TaskSingleOutput:
        log.info("TasksCreateWorkflow started")
        try:
            # Resolve agent_name to agent_id if needed
            if (
                workflow_input.agent_name
                and not workflow_input.agent_id
            ):
                log.info(
                    f"Resolving agent name: {workflow_input.agent_name}"
                )
                agent_resolve_result = await workflow.step(
                    function=agents_resolve_by_name,
                    function_input=AgentResolveInput(
                        workspace_id=workflow_input.workspace_id,
                        agent_name=workflow_input.agent_name,
                    ),
                    start_to_close_timeout=timedelta(seconds=10),
                )
                # Update workflow_input to use the resolved agent_id
                workflow_input.agent_id = (
                    agent_resolve_result.agent_id
                )
                log.info(
                    f"Resolved agent name to ID: {agent_resolve_result.agent_id}"
                )

            result = await workflow.step(
                function=tasks_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=2),
            )

            agent_task = await workflow.child_start(
                agent_id=f"task_agent_{result.task.id}",
                agent=AgentTask,
                agent_input=AgentTaskInput(
                    title=result.task.title,
                    description=result.task.description or "",
                    status=result.task.status,
                    agent_id=result.task.agent_id,
                    assigned_to_id=result.task.assigned_to_id
                    or None,
                ),
                parent_close_policy=ParentClosePolicy.ABANDON,
            )

            log.info(
                "TasksCreateWorkflow agent", agent_task=agent_task
            )

            await workflow.step(
                function=tasks_update_agent_task_id,
                function_input=TaskUpdateAgentTaskIdInput(
                    task_id=result.task.id,
                    agent_task_id=agent_task.id,
                ),
            )

            await workflow.step(
                function=send_agent_event,
                function_input=SendAgentEventInput(
                    event_name="messages",
                    agent_id=agent_task.id,
                    event_input={
                        "messages": [
                            {
                                "role": "user",
                                "content": result.task.description,
                            }
                        ]
                    },
                ),
            )
        except Exception as e:
            error_message = f"Error during tasks_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return result


@workflow.defn()
class TasksUpdateWorkflow:
    """Workflow to update an existing task."""

    @workflow.run
    async def run(
        self, workflow_input: TaskUpdateInput
    ) -> TaskSingleOutput:
        log.info("TasksUpdateWorkflow started")
        try:
            # First get the current task to check its status and agent_task_id
            current_task = None
            if hasattr(workflow_input, 'status') and workflow_input.status in ["completed", "closed"]:
                try:
                    current_task_result = await workflow.step(
                        function=tasks_get_by_id,
                        function_input=TaskGetByIdInput(task_id=workflow_input.task_id),
                        start_to_close_timeout=timedelta(seconds=30),
                    )
                    current_task = current_task_result.task if current_task_result else None
                except Exception as e:
                    log.warning(f"Failed to get current task for agent stopping: {e}")

            # If task is being completed/closed and has an active agent, stop the agent FIRST
            if (current_task and 
                current_task.agent_task_id and 
                hasattr(workflow_input, 'status') and 
                workflow_input.status in ["completed", "closed"]):
                
                try:
                    log.info(f"Stopping agent {current_task.agent_task_id} before task {workflow_input.status}")
                    await workflow.step(
                        function=send_agent_event,
                        function_input=SendAgentEventInput(
                            event_name="end",
                            agent_id=current_task.agent_task_id,
                        ),
                        start_to_close_timeout=timedelta(seconds=30),
                    )
                    log.info(f"Successfully sent end event to agent {current_task.agent_task_id}")
                except Exception as e:
                    # Don't fail the task update if agent stopping fails, just log it
                    # This can happen if the agent workflow doesn't exist or has already completed
                    if "workflow not found" in str(e).lower():
                        log.info(f"Agent workflow {current_task.agent_task_id} not found - likely already completed or stopped")
                    else:
                        log.warning(f"Failed to stop agent {current_task.agent_task_id}: {e}")

            # Then update the task in the database
            result = await workflow.step(
                function=tasks_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            return result

        except Exception as e:
            error_message = f"Error during tasks_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TasksDeleteWorkflow:
    """Workflow to delete a task."""

    @workflow.run
    async def run(
        self, workflow_input: TaskGetByIdInput
    ) -> TaskDeleteOutput:
        log.info("TasksDeleteWorkflow started")
        try:
            return await workflow.step(
                function=tasks_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during tasks_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TasksGetByIdWorkflow:
    """Workflow to get a specific task by ID."""

    @workflow.run
    async def run(
        self, workflow_input: TaskGetByIdInput
    ) -> TaskSingleOutput:
        log.info("TasksGetByIdWorkflow started")
        try:
            return await workflow.step(
                function=tasks_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during tasks_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TasksGetByStatusWorkflow:
    """Workflow to get tasks by status."""

    @workflow.run
    async def run(
        self, workflow_input: TaskGetByStatusInput
    ) -> TaskListOutput:
        log.info("TasksGetByStatusWorkflow started")
        try:
            return await workflow.step(
                function=tasks_get_by_status,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during tasks_get_by_status: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TasksUpdateAgentTaskIdWorkflow:
    """Workflow to update agent_task_id when agent starts execution."""

    @workflow.run
    async def run(
        self, workflow_input: TaskUpdateAgentTaskIdInput
    ) -> TaskSingleOutput:
        log.info("TasksUpdateAgentTaskIdWorkflow started")
        try:
            return await workflow.step(
                function=tasks_update_agent_task_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during tasks_update_agent_task_id: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class PlaygroundCreateDualTasksWorkflow:
    """Workflow to create two tasks simultaneously for playground A/B comparison."""

    @workflow.run
    async def run(self, workflow_input: dict) -> dict:
        log.info("PlaygroundCreateDualTasksWorkflow started")
        try:
            workspace_id = workflow_input["workspace_id"]
            task_description = workflow_input["task_description"]
            draft_agent_id = workflow_input["draft_agent_id"]
            comparison_agent_id = workflow_input[
                "comparison_agent_id"
            ]

            # Create input for both task creation workflows
            draft_task_input = TaskCreateInput(
                workspace_id=workspace_id,
                title=f"Playground Draft: {task_description[:50]}...",
                description=task_description,
                agent_id=draft_agent_id,
                status="active",
            )

            comparison_task_input = TaskCreateInput(
                workspace_id=workspace_id,
                title=f"Playground Comparison: {task_description[:50]}...",
                description=task_description,
                agent_id=comparison_agent_id,
                status="active",
            )

            # Execute both TasksCreateWorkflow instances in parallel
            (
                draft_result,
                comparison_result,
            ) = await asyncio.gather(
                workflow.child_execute(
                    workflow=TasksCreateWorkflow,
                    workflow_input=draft_task_input,
                    workflow_id=f"playground_draft_task_{workflow_info().workflow_id}",
                ),
                workflow.child_execute(
                    workflow=TasksCreateWorkflow,
                    workflow_input=comparison_task_input,
                    workflow_id=f"playground_comparison_task_{workflow_info().workflow_id}",
                ),
            )

        except Exception as e:
            error_message = (
                f"Error during playground dual task creation: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return {
                "draft_task_id": draft_result.task.id,
                "comparison_task_id": comparison_result.task.id,
                "draft_agent_task_id": draft_result.task.agent_task_id,
                "comparison_agent_task_id": comparison_result.task.agent_task_id,
            }
