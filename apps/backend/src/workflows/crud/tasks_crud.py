import asyncio
from datetime import timedelta

from pydantic import BaseModel, Field, model_validator
from restack_ai.workflow import (
    NonRetryableError,
    ParentClosePolicy,
    import_functions,
    log,
    workflow,
    workflow_info,
)

from src.agents.agent_task import AgentTask, AgentTaskInput
from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.agents_crud import (
        AgentIdInput,
        AgentResolveInput,
        agents_get_by_id,
        agents_resolve_by_name,
    )
    from src.functions.llm_response_stream import Message
    from src.functions.send_agent_event import (
        SendAgentEventInput,
        send_agent_event,
    )
    from src.functions.tasks_crud import (
        BuildSummaryInput,
        BuildSummaryOutput,
        TaskCreateInput,
        TaskDeleteOutput,
        TaskGetByIdInput,
        TaskGetByStatusInput,
        TaskGetByWorkspaceInput,
        TaskListOutput,
        TaskSingleOutput,
        TaskStatsOutput,
        TaskUpdateAgentTaskIdInput,
        TaskUpdateInput,
        tasks_create,
        tasks_delete,
        tasks_get_build_summary,
        tasks_get_by_id,
        tasks_get_by_status,
        tasks_get_stats,
        tasks_read,
        tasks_update,
        tasks_update_agent_task_id,
    )


def _raise_agent_not_found_or_not_public() -> None:
    raise NonRetryableError(
        message="Agent not found or not public"
    )


def _raise_public_agent_no_workspace() -> None:
    raise NonRetryableError(
        message="Public agent has no workspace_id; cannot create task"
    )


# Input models for workflows
class TasksCreateWorkflowInput(BaseModel):
    """Single input for task creation. Omit workspace_id for public agent (agent_id required)."""

    workspace_id: str | None = None
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    status: str = Field(
        default="in_progress",
        pattern="^(in_progress|in_review|closed|completed|failed)$",
    )
    agent_id: str | None = None
    agent_name: str | None = None
    assigned_to_id: str | None = None
    temporal_agent_id: str | None = None
    parent_task_id: str | None = None
    temporal_parent_agent_id: str | None = None
    schedule_spec: dict | None = None
    schedule_task_id: str | None = None
    is_scheduled: bool = False
    schedule_status: str | None = Field(
        None, pattern="^(active|inactive|paused)$"
    )
    temporal_schedule_id: str | None = None
    team_id: str | None = None

    @model_validator(mode="after")
    def public_path_requires_agent_id(
        self,
    ) -> "TasksCreateWorkflowInput":
        if not self.workspace_id and not self.agent_id:
            msg = "agent_id is required when workspace_id is omitted (public agent)"
            raise ValueError(msg)
        return self

    def to_task_create_input(
        self,
        *,
        workspace_id: str,
        team_id: str | None = None,
        assigned_to_id: str | None = None,
    ) -> TaskCreateInput:
        """Build TaskCreateInput for the activity (all required fields set)."""
        return TaskCreateInput(
            workspace_id=workspace_id,
            title=self.title,
            description=self.description,
            status=self.status,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            assigned_to_id=assigned_to_id or self.assigned_to_id,
            temporal_agent_id=self.temporal_agent_id,
            parent_task_id=self.parent_task_id,
            temporal_parent_agent_id=self.temporal_parent_agent_id,
            schedule_spec=self.schedule_spec,
            schedule_task_id=self.schedule_task_id,
            is_scheduled=self.is_scheduled,
            schedule_status=self.schedule_status,
            temporal_schedule_id=self.temporal_schedule_id,
            team_id=team_id
            if team_id is not None
            else self.team_id,
        )


class PlaygroundCreateDualTasksInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    task_description: str = Field(..., min_length=1)
    draft_agent_id: str = Field(..., min_length=1)
    comparison_agent_id: str = Field(..., min_length=1)


# Workflow definitions
@workflow.defn()
class TasksReadWorkflow:
    """Workflow to read all tasks."""

    @workflow.run
    async def run(
        self, workflow_input: TaskGetByWorkspaceInput
    ) -> TaskListOutput:
        log.info("TasksReadWorkflow started")
        try:
            return await workflow.step(
                function=tasks_read,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during tasks_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TasksCreateWorkflow:
    """Workflow to create a new task (authenticated or public agent)."""

    @workflow.run
    async def run(
        self,
        workflow_input: TasksCreateWorkflowInput | dict,
    ) -> TaskSingleOutput:
        log.info("TasksCreateWorkflow started")
        input_data = (
            workflow_input
            if isinstance(
                workflow_input, TasksCreateWorkflowInput
            )
            else TasksCreateWorkflowInput.model_validate(
                workflow_input
            )
        )
        try:
            # Resolve to TaskCreateInput: authenticated (has workspace_id) or public (resolve agent)
            if input_data.workspace_id:
                task_input = input_data.to_task_create_input(
                    workspace_id=input_data.workspace_id,
                )
            else:
                agent_result = await workflow.step(
                    function=agents_get_by_id,
                    function_input=AgentIdInput(
                        agent_id=input_data.agent_id,
                        public_only=True,
                    ),
                    task_queue=TASK_QUEUE,
                    start_to_close_timeout=timedelta(seconds=10),
                )
                if not agent_result.agent:
                    _raise_agent_not_found_or_not_public()
                agent_data = agent_result.agent
                if not agent_data.workspace_id:
                    _raise_public_agent_no_workspace()
                task_input = input_data.to_task_create_input(
                    workspace_id=agent_data.workspace_id,
                    team_id=agent_data.team_id,
                    assigned_to_id=None,
                )

            # Resolve agent_name to agent_id if needed
            if task_input.agent_name and not task_input.agent_id:
                log.info(
                    f"Resolving agent name: {task_input.agent_name}"
                )
                agent_resolve_result = await workflow.step(
                    function=agents_resolve_by_name,
                    function_input=AgentResolveInput(
                        workspace_id=task_input.workspace_id,
                        agent_name=task_input.agent_name,
                    ),
                    task_queue=TASK_QUEUE,
                    start_to_close_timeout=timedelta(seconds=10),
                )
                # Update task_input to use the resolved agent_id
                task_input.agent_id = (
                    agent_resolve_result.agent_id
                )
                log.info(
                    f"Resolved agent name to ID: {agent_resolve_result.agent_id}"
                )

            result = await workflow.step(
                function=tasks_create,
                function_input=task_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=2),
            )

            # Get temporal_parent_agent_id from the task (already in DB)
            temporal_parent_agent_id = (
                result.task.temporal_parent_agent_id
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
                    user_id=result.task.assigned_to_id,
                    workspace_id=result.task.workspace_id,
                    task_id=result.task.id,
                    parent_task_id=result.task.parent_task_id,
                    temporal_parent_agent_id=temporal_parent_agent_id,
                ),
                task_queue=TASK_QUEUE,
                parent_close_policy=ParentClosePolicy.ABANDON,
            )

            log.info(
                "TasksCreateWorkflow agent", agent_task=agent_task
            )

            updated_result = await workflow.step(
                function=tasks_update_agent_task_id,
                function_input=TaskUpdateAgentTaskIdInput(
                    task_id=result.task.id,
                    temporal_agent_id=agent_task.id,
                ),
                task_queue=TASK_QUEUE,
            )

            await workflow.step(
                function=send_agent_event,
                function_input=SendAgentEventInput(
                    event_name="messages",
                    temporal_agent_id=agent_task.id,
                    event_input={
                        "messages": [
                            Message(
                                role="user",
                                content=result.task.description,
                            ).model_dump()
                        ]
                    },
                ),
                task_queue=TASK_QUEUE,
            )
        except Exception as e:
            error_message = f"Error during tasks_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            # Return the updated result with temporal_agent_id set
            return updated_result


@workflow.defn()
class TasksUpdateWorkflow:
    """Workflow to update an existing task."""

    @workflow.run
    async def run(
        self, workflow_input: TaskUpdateInput
    ) -> TaskSingleOutput:
        log.info("TasksUpdateWorkflow started")
        try:
            # First get the current task to check its status and temporal_agent_id
            current_task = None
            if hasattr(
                workflow_input, "status"
            ) and workflow_input.status in [
                "completed",
                "closed",
                "failed",
            ]:
                try:
                    current_task_result = await workflow.step(
                        function=tasks_get_by_id,
                        function_input=TaskGetByIdInput(
                            task_id=workflow_input.task_id
                        ),
                        task_queue=TASK_QUEUE,
                        start_to_close_timeout=timedelta(
                            seconds=30
                        ),
                    )
                    current_task = (
                        current_task_result.task
                        if current_task_result
                        else None
                    )
                except (ValueError, RuntimeError, OSError) as e:
                    log.warning(
                        f"Failed to get current task for agent stopping: {e}"
                    )

            # If task is being completed/closed/failed and has an active agent, stop the agent FIRST
            if (
                current_task
                and current_task.temporal_agent_id
                and hasattr(workflow_input, "status")
                and workflow_input.status
                in ["completed", "closed", "failed"]
            ):
                try:
                    log.info(
                        f"Stopping agent {current_task.temporal_agent_id} before task {workflow_input.status}"
                    )
                    await workflow.step(
                        function=send_agent_event,
                        function_input=SendAgentEventInput(
                            event_name="end",
                            temporal_agent_id=current_task.temporal_agent_id,
                            temporal_run_id=getattr(
                                workflow_input,
                                "temporal_run_id",
                                None,
                            ),
                        ),
                        task_queue=TASK_QUEUE,
                        start_to_close_timeout=timedelta(
                            seconds=30
                        ),
                    )
                    log.info(
                        f"Successfully sent end event to agent {current_task.temporal_agent_id}"
                    )
                except (ValueError, RuntimeError, OSError) as e:
                    # Don't fail the task update if agent stopping fails, just log it
                    # This can happen if the agent workflow doesn't exist or has already completed
                    if "workflow not found" in str(e).lower():
                        log.info(
                            f"Agent workflow {current_task.temporal_agent_id} not found - likely already completed or stopped"
                        )
                    else:
                        log.warning(
                            f"Failed to stop agent {current_task.temporal_agent_id}: {e}"
                        )

            # Then update the task in the database
            return await workflow.step(
                function=tasks_update,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

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
                task_queue=TASK_QUEUE,
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
        try:
            return await workflow.step(
                function=tasks_get_by_id,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during tasks_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class TasksGetBuildSummaryWorkflow:
    """Workflow to get build summary (agents, datasets, tasks, view_specs) for a build task."""

    @workflow.run
    async def run(
        self, workflow_input: BuildSummaryInput
    ) -> BuildSummaryOutput:
        try:
            return await workflow.step(
                function=tasks_get_build_summary,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during tasks_get_build_summary: {e}"
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
                task_queue=TASK_QUEUE,
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
    """Workflow to update temporal_agent_id when agent starts execution."""

    @workflow.run
    async def run(
        self, workflow_input: TaskUpdateAgentTaskIdInput
    ) -> TaskSingleOutput:
        log.info("TasksUpdateAgentTaskIdWorkflow started")
        try:
            return await workflow.step(
                function=tasks_update_agent_task_id,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during tasks_update_temporal_agent_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class PlaygroundCreateDualTasksWorkflow:
    """Workflow to create two tasks simultaneously for playground A/B comparison with metrics evaluation."""

    @workflow.run
    async def run(
        self, workflow_input: PlaygroundCreateDualTasksInput
    ) -> dict:
        log.info("PlaygroundCreateDualTasksWorkflow started")
        try:
            workspace_id = workflow_input.workspace_id
            task_description = workflow_input.task_description
            draft_agent_id = workflow_input.draft_agent_id
            comparison_agent_id = (
                workflow_input.comparison_agent_id
            )

            # Create input for both task creation workflows
            draft_task_input = TasksCreateWorkflowInput(
                workspace_id=workspace_id,
                title=f"Playground Draft: {task_description[:50]}...",
                description=task_description,
                agent_id=draft_agent_id,
                status="in_progress",
            )

            comparison_task_input = TasksCreateWorkflowInput(
                workspace_id=workspace_id,
                title=f"Playground Comparison: {task_description[:50]}...",
                description=task_description,
                agent_id=comparison_agent_id,
                status="in_progress",
            )

            # Execute both TasksCreateWorkflow instances in parallel
            log.info(
                "Creating and executing both playground tasks in parallel"
            )
            (
                draft_result,
                comparison_result,
            ) = await asyncio.gather(
                workflow.child_execute(
                    workflow=TasksCreateWorkflow,
                    workflow_input=draft_task_input,
                    workflow_id=f"playground_draft_task_{workflow_info().workflow_id}",
                    task_queue=TASK_QUEUE,
                ),
                workflow.child_execute(
                    workflow=TasksCreateWorkflow,
                    workflow_input=comparison_task_input,
                    workflow_id=f"playground_comparison_task_{workflow_info().workflow_id}",
                    task_queue=TASK_QUEUE,
                ),
            )

            draft_task_id = draft_result.task.id
            comparison_task_id = comparison_result.task.id

            log.info(
                f"Both tasks completed. Draft: {draft_task_id}, Comparison: {comparison_task_id}"
            )

            # Fetch the completed tasks to get output and performance data
            (
                _draft_task_details,
                _comparison_task_details,
            ) = await asyncio.gather(
                workflow.step(
                    function=tasks_get_by_id,
                    function_input=TaskGetByIdInput(
                        task_id=draft_task_id
                    ),
                    task_queue=TASK_QUEUE,
                    start_to_close_timeout=timedelta(seconds=10),
                ),
                workflow.step(
                    function=tasks_get_by_id,
                    function_input=TaskGetByIdInput(
                        task_id=comparison_task_id
                    ),
                    task_queue=TASK_QUEUE,
                    start_to_close_timeout=timedelta(seconds=10),
                ),
            )

            # NOTE: Metrics evaluation for playground comparison disabled
            # Agent metrics assignment system needs to be redesigned

        except Exception as e:
            error_message = (
                f"Error during playground dual task creation: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return {
                "draft_task_id": draft_task_id,
                "comparison_task_id": comparison_task_id,
                "draft_temporal_agent_id": draft_result.task.temporal_agent_id,
                "comparison_temporal_agent_id": comparison_result.task.temporal_agent_id,
                "metrics_enabled": False,  # Metrics disabled - assignment system needs redesign
            }


@workflow.defn()
class TasksGetStatsWorkflow:
    """Workflow to get task statistics by status for a workspace."""

    @workflow.run
    async def run(
        self, workflow_input: TaskGetByWorkspaceInput
    ) -> TaskStatsOutput:
        log.info("TasksGetStatsWorkflow started")
        try:
            return await workflow.step(
                function=tasks_get_stats,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during tasks_get_stats: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
