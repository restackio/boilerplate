import uuid

from pydantic import BaseModel, Field, field_validator
from restack_ai.function import NonRetryableError, function, log
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.database.connection import get_async_db
from src.database.models import Agent, Dataset, Task
from src.functions.datasets_crud import (
    DatasetFileSummary,
    ListDatasetFilesInput,
    list_dataset_files,
)


# Pydantic models for input validation
class TaskCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
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
    # Subtask-related fields
    parent_task_id: str | None = None
    temporal_parent_agent_id: str | None = None
    # Schedule-related fields
    schedule_spec: dict | None = None
    schedule_task_id: str | None = None
    is_scheduled: bool = False
    schedule_status: str | None = Field(
        None, pattern="^(active|inactive|paused)$"
    )
    temporal_schedule_id: str | None = None
    team_id: str | None = None
    task_metadata: dict | None = None
    view_specs: list | None = None  # Build task view definitions
    pattern_specs: dict | None = (
        None  # Agent design pattern for React Flow
    )

class TaskUpdateInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = Field(
        None,
        pattern="^(in_progress|in_review|closed|completed|failed)$",
    )
    agent_id: str | None = None
    assigned_to_id: str | None = None
    temporal_agent_id: str | None = None
    agent_state: dict | None = None
    # Subtask-related fields
    parent_task_id: str | None = None
    temporal_parent_agent_id: str | None = None
    # Schedule-related fields
    schedule_spec: dict | None = None
    schedule_task_id: str | None = None
    is_scheduled: bool | None = None
    schedule_status: str | None = Field(
        None, pattern="^(active|inactive|paused)$"
    )
    temporal_schedule_id: str | None = None
    task_metadata: dict | None = None
    view_specs: list | None = None  # Build task view definitions
    pattern_specs: dict | None = (
        None  # Agent design pattern for React Flow
    )
    temporal_run_id: str | None = (
        None  # For sending end event to the correct run
    )

    @field_validator(
        "assigned_to_id",
        "agent_id",
        "schedule_task_id",
        "parent_task_id",
        "temporal_parent_agent_id",
        mode="before",
    )
    @classmethod
    def validate_optional_string_fields(
        cls, v: str | None
    ) -> str | None:
        """Convert empty strings to None for optional UUID fields."""
        if v == "":
            return None
        return v


class TaskGetByIdInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    workspace_id: str | None = None


class BuildSummaryInput(BaseModel):
    """Input for get build summary: build task id and workspace for auth."""

    build_task_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)


class TaskGetByStatusInput(BaseModel):
    status: str = Field(
        ...,
        pattern="^(in_progress|in_review|closed|completed|failed)$",
    )


class TaskDeleteInput(BaseModel):
    task_id: str = Field(..., min_length=1)


class TaskUpdateAgentTaskIdInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    temporal_agent_id: str = Field(..., min_length=1)


class TaskSaveAgentStateInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    agent_state: dict  # Full state from agent.state_response()


class TaskGetByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    team_id: str | None = None
    exclude_build_tasks: bool = Field(
        default=False,
        description="When True, exclude tasks with title 'Build' (agent build tasks) from counts.",
    )


class ListViewsForDatasetInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    dataset_id: str = Field(..., min_length=1)


class GetViewInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    dataset_id: str = Field(..., min_length=1)
    view_id: str = Field(..., min_length=1)


# Pydantic models for output serialization
class TaskOutput(BaseModel):
    id: str
    workspace_id: str
    team_id: str | None
    team_name: str | None
    title: str
    description: str | None
    status: str
    agent_id: str
    agent_name: str
    parent_agent_id: str | None = (
        None  # Parent agent ID for metrics
    )
    assigned_to_id: str | None
    assigned_to_name: str | None
    temporal_agent_id: str | None
    agent_state: dict | None = None
    # Subtask-related fields
    parent_task_id: str | None = None
    temporal_parent_agent_id: str | None
    # Schedule-related fields
    schedule_spec: dict | None = None
    schedule_task_id: str | None = None
    is_scheduled: bool = False
    schedule_status: str | None = None
    temporal_schedule_id: str | None
    task_metadata: dict | None = None
    view_specs: list | None = None  # Build task view definitions
    pattern_specs: dict | None = (
        None  # Agent design pattern: { title?, nodes, edges } for React Flow
    )
    created_at: str | None
    updated_at: str | None

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class TaskListOutput(BaseModel):
    tasks: list[TaskOutput]


class TaskSingleOutput(BaseModel):
    task: TaskOutput


class BuildSummaryAgentOutput(BaseModel):
    """Minimal agent info for build summary canvas."""

    id: str
    name: str
    description: str | None
    workspace_id: str
    type: str = "interactive"


class BuildSummaryDatasetOutput(BaseModel):
    """Minimal dataset info for build summary canvas."""

    id: str
    name: str
    description: str | None
    workspace_id: str


class BuildSummaryOutput(BaseModel):
    """Agents, datasets, tasks, and view specs for a build task."""

    agents: list[BuildSummaryAgentOutput] = Field(default_factory=list)
    datasets: list[BuildSummaryDatasetOutput] = Field(default_factory=list)
    tasks: list[TaskOutput] = Field(default_factory=list)
    view_specs: list = Field(default_factory=list)


class BuildSessionSnapshotOutput(BaseModel):
    """Build task row + summary + task-files listing (single round-trip for builder UI)."""

    task: TaskOutput
    summary: BuildSummaryOutput
    task_files: list[DatasetFileSummary] = Field(default_factory=list)


class TaskDeleteOutput(BaseModel):
    success: bool


class ListViewsForDatasetOutput(BaseModel):
    success: bool = True
    views: list[dict] = Field(default_factory=list)
    error: str | None = None


class GetViewOutput(BaseModel):
    success: bool = True
    view: dict | None = None
    error: str | None = None


class TaskStatsOutput(BaseModel):
    in_progress: int
    in_review: int
    closed: int
    completed: int
    total: int


@function.defn()
async def tasks_read(
    function_input: TaskGetByWorkspaceInput,
) -> TaskListOutput:
    """Read all tasks from database for a specific workspace."""
    async for db in get_async_db():
        try:
            tasks_query = (
                select(Task)
                .options(
                    selectinload(Task.agent),
                    selectinload(Task.assigned_to_user),
                    selectinload(Task.team),
                )
                .where(
                    Task.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
                .order_by(Task.updated_at.desc())
            )

            if function_input.team_id:
                tasks_query = tasks_query.where(
                    Task.team_id
                    == uuid.UUID(function_input.team_id)
                )

            result = await db.execute(tasks_query)
            tasks = result.scalars().all()

            output_result = [
                TaskOutput(
                    id=str(task.id),
                    workspace_id=str(task.workspace_id),
                    team_id=str(task.team_id)
                    if task.team_id
                    else None,
                    team_name=task.team.name
                    if task.team
                    else None,
                    title=task.title,
                    description=task.description,
                    status=task.status,
                    agent_id=str(task.agent_id),
                    agent_name=task.agent.name
                    if task.agent
                    else "N/A",
                    parent_agent_id=str(
                        task.agent.parent_agent_id
                    )
                    if task.agent and task.agent.parent_agent_id
                    else None,
                    assigned_to_id=str(task.assigned_to_id)
                    if task.assigned_to_id
                    else None,
                    assigned_to_name=task.assigned_to_user.name
                    if task.assigned_to_user
                    else "N/A",
                    temporal_agent_id=task.temporal_agent_id,
                    # Subtask-related fields
                    parent_task_id=str(task.parent_task_id)
                    if task.parent_task_id
                    else None,
                    temporal_parent_agent_id=task.temporal_parent_agent_id,
                    # Schedule-related fields
                    schedule_spec=task.schedule_spec,
                    schedule_task_id=str(task.schedule_task_id)
                    if task.schedule_task_id
                    else None,
                    is_scheduled=task.is_scheduled,
                    schedule_status=task.schedule_status,
                    temporal_schedule_id=task.temporal_schedule_id,
                    task_metadata=task.task_metadata,
                    view_specs=task.view_specs
                    if getattr(task, "view_specs", None)
                    is not None
                    else [],
                    pattern_specs=task.pattern_specs
                    if getattr(task, "pattern_specs", None)
                    is not None
                    else {},
                    created_at=task.created_at.isoformat()
                    if task.created_at
                    else None,
                    updated_at=task.updated_at.isoformat()
                    if task.updated_at
                    else None,
                )
                for task in tasks
            ]

            return TaskListOutput(tasks=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Database error: {e!s}"
            ) from e
    return None


@function.defn()
async def tasks_create(
    task_data: TaskCreateInput,
) -> TaskSingleOutput:
    """Create a new task."""
    # Normalize input (activity may receive dict from SDK)
    if isinstance(task_data, dict):
        task_data = TaskCreateInput.model_validate(task_data)
    async for db in get_async_db():
        try:
            # Create task with UUID
            task = Task(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(task_data.workspace_id),
                title=task_data.title,
                description=task_data.description,
                status=task_data.status,
                agent_id=uuid.UUID(task_data.agent_id)
                if task_data.agent_id
                else None,
                assigned_to_id=uuid.UUID(task_data.assigned_to_id)
                if task_data.assigned_to_id
                else None,
                temporal_agent_id=task_data.temporal_agent_id,
                # Subtask-related fields
                parent_task_id=uuid.UUID(task_data.parent_task_id)
                if task_data.parent_task_id
                else None,
                temporal_parent_agent_id=task_data.temporal_parent_agent_id,
                # Schedule-related fields
                schedule_spec=task_data.schedule_spec,
                schedule_task_id=uuid.UUID(
                    task_data.schedule_task_id
                )
                if task_data.schedule_task_id
                else None,
                is_scheduled=task_data.is_scheduled,
                schedule_status=task_data.schedule_status,
                temporal_schedule_id=task_data.temporal_schedule_id,
                team_id=uuid.UUID(task_data.team_id)
                if task_data.team_id
                else None,
                task_metadata=task_data.task_metadata or {},
                view_specs=task_data.view_specs
                if task_data.view_specs is not None
                else [],
                pattern_specs=task_data.pattern_specs
                if task_data.pattern_specs is not None
                else {},
            )

            db.add(task)
            await db.commit()
            await db.refresh(task)

            # Load the related data for output
            await db.refresh(
                task, ["agent", "assigned_to_user", "team"]
            )

            result = TaskOutput(
                id=str(task.id),
                workspace_id=str(task.workspace_id),
                team_id=str(task.team_id)
                if task.team_id
                else None,
                team_name=task.team.name if task.team else None,
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name
                if task.agent
                else "N/A",
                parent_agent_id=str(task.agent.parent_agent_id)
                if task.agent and task.agent.parent_agent_id
                else None,
                assigned_to_id=str(task.assigned_to_id)
                if task.assigned_to_id
                else None,
                assigned_to_name=task.assigned_to_user.name
                if task.assigned_to_user
                else None,
                temporal_agent_id=task.temporal_agent_id,
                agent_state=task.agent_state,
                # Subtask-related fields
                parent_task_id=str(task.parent_task_id)
                if task.parent_task_id
                else None,
                temporal_parent_agent_id=task.temporal_parent_agent_id,
                # Schedule-related fields
                schedule_spec=task.schedule_spec,
                schedule_task_id=str(task.schedule_task_id)
                if task.schedule_task_id
                else None,
                is_scheduled=task.is_scheduled,
                schedule_status=task.schedule_status,
                temporal_schedule_id=task.temporal_schedule_id,
                task_metadata=task.task_metadata,
                view_specs=task.view_specs
                if getattr(task, "view_specs", None) is not None
                else [],
                pattern_specs=task.pattern_specs
                if getattr(task, "pattern_specs", None)
                is not None
                else {},
                created_at=task.created_at.isoformat()
                if task.created_at
                else None,
                updated_at=task.updated_at.isoformat()
                if task.updated_at
                else None,
            )

            return TaskSingleOutput(task=result)
        except Exception as e:
            await db.rollback()
            log.error(f"tasks_create activity failed: {e!s}")
            raise NonRetryableError(
                message=f"Failed to create task: {e!s}"
            ) from e
    return None


@function.defn()
async def tasks_update(
    function_input: TaskUpdateInput,
) -> TaskSingleOutput:
    """Update an existing task."""
    async for db in get_async_db():
        try:
            task_query = select(Task).where(
                Task.id == uuid.UUID(function_input.task_id)
            )
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                raise NonRetryableError(
                    message=f"Task with id {function_input.task_id} not found"
                )
            # Update fields (only non-None values, excluding task_id and temporal_run_id)
            # temporal_run_id is only used by TasksUpdateWorkflow when sending end event
            update_data = function_input.model_dump(
                exclude_unset=True,
                exclude={"task_id", "temporal_run_id"},
            )
            for key, value in update_data.items():
                if hasattr(task, key) and value is not None:
                    # Handle UUID fields
                    if (
                        (key == "agent_id" and value)
                        or (key == "assigned_to_id" and value)
                        or (key == "schedule_task_id" and value)
                        or (key == "parent_task_id" and value)
                    ):
                        setattr(task, key, uuid.UUID(value))
                    elif key in [
                        "temporal_agent_id",
                        "temporal_parent_agent_id",
                        "temporal_schedule_id",
                    ] or (
                        (
                            key == "agent_state"
                            and value is not None
                        )
                        or (
                            key == "schedule_spec"
                            and value is not None
                        )
                        or (
                            key == "view_specs"
                            and value is not None
                        )
                        or (
                            key == "pattern_specs"
                            and value is not None
                        )
                        or (
                            key
                            in [
                                "is_scheduled",
                                "schedule_status",
                            ]
                            and value is not None
                        )
                    ):
                        setattr(task, key, value)
                    else:
                        setattr(task, key, value)

            await db.commit()
            await db.refresh(task)

            # Load the related data for output
            await db.refresh(
                task, ["agent", "assigned_to_user", "team"]
            )

            result = TaskOutput(
                id=str(task.id),
                workspace_id=str(task.workspace_id),
                team_id=str(task.team_id)
                if task.team_id
                else None,
                team_name=task.team.name if task.team else None,
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name
                if task.agent
                else "N/A",
                parent_agent_id=str(task.agent.parent_agent_id)
                if task.agent and task.agent.parent_agent_id
                else None,
                assigned_to_id=str(task.assigned_to_id)
                if task.assigned_to_id
                else None,
                assigned_to_name=task.assigned_to_user.name
                if task.assigned_to_user
                else None,
                temporal_agent_id=task.temporal_agent_id,
                agent_state=task.agent_state,
                # Subtask-related fields
                parent_task_id=str(task.parent_task_id)
                if task.parent_task_id
                else None,
                temporal_parent_agent_id=task.temporal_parent_agent_id,
                # Schedule-related fields
                schedule_spec=task.schedule_spec,
                schedule_task_id=str(task.schedule_task_id)
                if task.schedule_task_id
                else None,
                is_scheduled=task.is_scheduled,
                schedule_status=task.schedule_status,
                temporal_schedule_id=task.temporal_schedule_id,
                task_metadata=task.task_metadata,
                view_specs=task.view_specs
                if getattr(task, "view_specs", None) is not None
                else [],
                pattern_specs=task.pattern_specs
                if getattr(task, "pattern_specs", None)
                is not None
                else {},
                created_at=task.created_at.isoformat()
                if task.created_at
                else None,
                updated_at=task.updated_at.isoformat()
                if task.updated_at
                else None,
            )

            return TaskSingleOutput(task=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to update task: {e!s}"
            ) from e
    return None


@function.defn()
async def tasks_save_agent_state(
    function_input: TaskSaveAgentStateInput,
) -> TaskSingleOutput:
    """Save complete agent state (events, todos, subtasks) to task.

    Called by agent when task completes to persist final state for historical viewing.
    While task is in_progress, frontend uses real-time Temporal state.
    """
    async for db in get_async_db():
        try:
            task_query = (
                select(Task)
                .options(
                    selectinload(Task.agent),
                    selectinload(Task.assigned_to_user),
                    selectinload(Task.team),
                )
                .where(
                    Task.id == uuid.UUID(function_input.task_id)
                )
            )
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                raise NonRetryableError(
                    message=f"Task with id {function_input.task_id} not found"
                )

            # Save complete agent state
            task.agent_state = function_input.agent_state
            task.updated_at = func.now()

            await db.commit()
            await db.refresh(task)

            output_result = TaskOutput(
                id=str(task.id),
                workspace_id=str(task.workspace_id),
                team_id=str(task.team_id)
                if task.team_id
                else None,
                team_name=task.team.name if task.team else None,
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name
                if task.agent
                else "N/A",
                parent_agent_id=str(task.agent.parent_agent_id)
                if task.agent and task.agent.parent_agent_id
                else None,
                assigned_to_id=str(task.assigned_to_id)
                if task.assigned_to_id
                else None,
                assigned_to_name=task.assigned_to_user.name
                if task.assigned_to_user
                else None,
                temporal_agent_id=task.temporal_agent_id,
                agent_state=task.agent_state,
                # Subtask-related fields
                parent_task_id=str(task.parent_task_id)
                if task.parent_task_id
                else None,
                temporal_parent_agent_id=task.temporal_parent_agent_id,
                # Schedule-related fields
                schedule_spec=task.schedule_spec,
                schedule_task_id=str(task.schedule_task_id)
                if task.schedule_task_id
                else None,
                is_scheduled=task.is_scheduled,
                schedule_status=task.schedule_status,
                temporal_schedule_id=task.temporal_schedule_id,
                task_metadata=task.task_metadata,
                view_specs=task.view_specs
                if getattr(task, "view_specs", None) is not None
                else [],
                pattern_specs=task.pattern_specs
                if getattr(task, "pattern_specs", None)
                is not None
                else {},
                created_at=task.created_at.isoformat(),
                updated_at=task.updated_at.isoformat(),
            )

            return TaskSingleOutput(task=output_result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to save agent state: {e!s}"
            ) from e
    return None


@function.defn()
async def tasks_delete(
    function_input: TaskGetByIdInput,
) -> TaskDeleteOutput:
    """Delete a task."""
    async for db in get_async_db():
        try:
            task_query = select(Task).where(
                Task.id == uuid.UUID(function_input.task_id)
            )
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                raise NonRetryableError(
                    message=f"Task with id {function_input.task_id} not found"
                )
            await db.delete(task)
            await db.commit()

            return TaskDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete task: {e!s}"
            ) from e
    return None


@function.defn()
async def tasks_get_by_id(
    function_input: TaskGetByIdInput,
) -> TaskSingleOutput:
    """Get task by ID."""
    async for db in get_async_db():
        try:
            task_query = (
                select(Task)
                .options(
                    selectinload(Task.agent),
                    selectinload(Task.assigned_to_user),
                    selectinload(Task.team),
                )
                .where(
                    Task.id == uuid.UUID(function_input.task_id)
                )
            )

            if function_input.workspace_id:
                task_query = task_query.where(
                    Task.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )

            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                raise NonRetryableError(
                    message=f"Task with id {function_input.task_id} not found"
                )
            return TaskSingleOutput(task=_task_row_to_output(task))
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get task: {e!s}"
            ) from e
    return None


BUILD_SUMMARY_TASKS_LIMIT = 100

# Workspace "task-files" dataset name (matches frontend task-files-list / workflow helpers).
TASK_FILES_DATASET_NAME = "task-files"


async def _build_build_summary_output(
    db: AsyncSession,
    build_task: Task,
    build_task_id: uuid.UUID,
) -> BuildSummaryOutput:
    """Agents, datasets, related tasks, and view_specs for a build task (one DB session)."""
    agents_result = await db.execute(
        select(Agent).where(
            Agent.build_task_id == build_task_id,
        )
    )
    agents = agents_result.scalars().all()
    agent_ids = {a.id for a in agents}

    datasets_result = await db.execute(
        select(Dataset).where(
            Dataset.build_task_id == build_task_id,
        )
    )
    datasets = datasets_result.scalars().all()

    task_conditions = [Task.parent_task_id == build_task_id]
    if agent_ids:
        task_conditions.append(Task.agent_id.in_(agent_ids))
    tasks_result = await db.execute(
        select(Task)
        .options(
            selectinload(Task.agent),
            selectinload(Task.assigned_to_user),
            selectinload(Task.team),
        )
        .where(or_(*task_conditions))
        .order_by(Task.updated_at.desc())
        .limit(BUILD_SUMMARY_TASKS_LIMIT)
    )
    tasks_list = list(tasks_result.scalars().all())

    view_specs = (
        build_task.view_specs
        if getattr(build_task, "view_specs", None) is not None
        else []
    )

    return BuildSummaryOutput(
        agents=[
            BuildSummaryAgentOutput(
                id=str(a.id),
                name=a.name,
                description=a.description,
                workspace_id=str(a.workspace_id),
                type=a.type or "interactive",
            )
            for a in agents
        ],
        datasets=[
            BuildSummaryDatasetOutput(
                id=str(d.id),
                name=d.name,
                description=d.description,
                workspace_id=str(d.workspace_id),
            )
            for d in datasets
        ],
        tasks=[
            TaskOutput(
                id=str(t.id),
                workspace_id=str(t.workspace_id),
                team_id=str(t.team_id) if t.team_id else None,
                team_name=t.team.name if t.team else None,
                title=t.title,
                description=t.description,
                status=t.status,
                agent_id=str(t.agent_id),
                agent_name=t.agent.name if t.agent else "N/A",
                parent_agent_id=(
                    str(t.agent.parent_agent_id)
                    if t.agent and t.agent.parent_agent_id
                    else None
                ),
                assigned_to_id=(
                    str(t.assigned_to_id) if t.assigned_to_id else None
                ),
                assigned_to_name=(
                    t.assigned_to_user.name
                    if t.assigned_to_user
                    else "N/A"
                ),
                temporal_agent_id=t.temporal_agent_id,
                agent_state=t.agent_state,
                parent_task_id=(
                    str(t.parent_task_id) if t.parent_task_id else None
                ),
                temporal_parent_agent_id=t.temporal_parent_agent_id,
                schedule_spec=t.schedule_spec,
                schedule_task_id=(
                    str(t.schedule_task_id)
                    if t.schedule_task_id
                    else None
                ),
                is_scheduled=t.is_scheduled,
                schedule_status=t.schedule_status,
                temporal_schedule_id=t.temporal_schedule_id,
                view_specs=(
                    t.view_specs
                    if getattr(t, "view_specs", None) is not None
                    else []
                ),
                pattern_specs=(
                    t.pattern_specs
                    if getattr(t, "pattern_specs", None) is not None
                    else {}
                ),
                created_at=(
                    t.created_at.isoformat() if t.created_at else None
                ),
                updated_at=(
                    t.updated_at.isoformat() if t.updated_at else None
                ),
            )
            for t in tasks_list
        ],
        view_specs=view_specs,
    )


@function.defn()
async def tasks_get_build_summary(
    function_input: BuildSummaryInput,
) -> BuildSummaryOutput:
    """Get agents, datasets, tasks, and view_specs for a build task. Requires workspace_id for auth."""
    async for db in get_async_db():
        try:
            build_task_id = uuid.UUID(function_input.build_task_id)
            workspace_uuid = uuid.UUID(function_input.workspace_id)

            task_result = await db.execute(
                select(Task)
                .where(
                    Task.id == build_task_id,
                    Task.workspace_id == workspace_uuid,
                )
                .limit(1)
            )
            build_task = task_result.scalar_one_or_none()
            if not build_task:
                raise NonRetryableError(
                    message="Build task not found or access denied"
                )

            return await _build_build_summary_output(db, build_task, build_task_id)
        except NonRetryableError:
            raise
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get build summary: {e!s}"
            ) from e
    return BuildSummaryOutput()


def _task_row_to_output(task: Task) -> TaskOutput:
    """Map a loaded Task ORM row (with agent / user / team selectinloads) to TaskOutput."""
    return TaskOutput(
        id=str(task.id),
        workspace_id=str(task.workspace_id),
        team_id=str(task.team_id) if task.team_id else None,
        team_name=task.team.name if task.team else None,
        title=task.title,
        description=task.description,
        status=task.status,
        agent_id=str(task.agent_id),
        agent_name=task.agent.name if task.agent else "N/A",
        parent_agent_id=str(task.agent.parent_agent_id)
        if task.agent and task.agent.parent_agent_id
        else None,
        assigned_to_id=str(task.assigned_to_id)
        if task.assigned_to_id
        else None,
        assigned_to_name=task.assigned_to_user.name
        if task.assigned_to_user
        else None,
        temporal_agent_id=task.temporal_agent_id,
        agent_state=task.agent_state,
        parent_task_id=str(task.parent_task_id)
        if task.parent_task_id
        else None,
        temporal_parent_agent_id=task.temporal_parent_agent_id,
        schedule_spec=task.schedule_spec,
        schedule_task_id=str(task.schedule_task_id)
        if task.schedule_task_id
        else None,
        is_scheduled=task.is_scheduled,
        schedule_status=task.schedule_status,
        temporal_schedule_id=task.temporal_schedule_id,
        view_specs=task.view_specs
        if getattr(task, "view_specs", None) is not None
        else [],
        pattern_specs=task.pattern_specs
        if getattr(task, "pattern_specs", None) is not None
        else {},
        created_at=task.created_at.isoformat() if task.created_at else None,
        updated_at=task.updated_at.isoformat() if task.updated_at else None,
    )


@function.defn()
async def tasks_get_build_session(
    function_input: BuildSummaryInput,
) -> BuildSessionSnapshotOutput:
    """Build task + summary + task-files in one workflow step (indexed Postgres + ClickHouse)."""
    async for db in get_async_db():
        try:
            build_task_id = uuid.UUID(function_input.build_task_id)
            workspace_uuid = uuid.UUID(function_input.workspace_id)

            task_result = await db.execute(
                select(Task)
                .options(
                    selectinload(Task.agent),
                    selectinload(Task.assigned_to_user),
                    selectinload(Task.team),
                )
                .where(
                    Task.id == build_task_id,
                    Task.workspace_id == workspace_uuid,
                )
                .limit(1)
            )
            build_task = task_result.scalar_one_or_none()
            if not build_task:
                raise NonRetryableError(
                    message="Build task not found or access denied"
                )

            task_output = _task_row_to_output(build_task)
            summary = await _build_build_summary_output(
                db, build_task, build_task_id
            )

            tf_result = await db.execute(
                select(Dataset.id).where(
                    Dataset.workspace_id == workspace_uuid,
                    Dataset.name == TASK_FILES_DATASET_NAME,
                )
            )
            task_files_dataset_id = tf_result.scalar_one_or_none()

            task_files: list[DatasetFileSummary] = []
            if task_files_dataset_id is not None:
                files_out = await list_dataset_files(
                    ListDatasetFilesInput(
                        workspace_id=function_input.workspace_id,
                        dataset_id=str(task_files_dataset_id),
                        task_id=str(build_task_id),
                    )
                )
                if files_out.success:
                    task_files = list(files_out.files or [])

            return BuildSessionSnapshotOutput(
                task=task_output,
                summary=summary,
                task_files=task_files,
            )
        except NonRetryableError:
            raise
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get build session: {e!s}"
            ) from e
    raise NonRetryableError(message="Failed to get build session: no database session")


def _view_specs_for_dataset(
    view_specs: list | None, dataset_id: str
) -> list[dict]:
    """Return view specs that reference the given dataset_id."""
    if not view_specs or not isinstance(view_specs, list):
        return []
    return [
        v
        for v in view_specs
        if isinstance(v, dict)
        and v.get("dataset_id") == dataset_id
    ]


@function.defn()
async def tasks_list_views_for_dataset(
    function_input: ListViewsForDatasetInput,
) -> ListViewsForDatasetOutput:
    """List view specs that reference the given dataset (from tasks.view_specs)."""
    if isinstance(function_input, dict):
        function_input = ListViewsForDatasetInput.model_validate(
            function_input
        )
    async for db in get_async_db():
        try:
            tasks_query = select(Task).where(
                Task.workspace_id
                == uuid.UUID(function_input.workspace_id)
            )
            result = await db.execute(tasks_query)
            tasks = result.scalars().all()
            views: list[dict] = []
            for task in tasks:
                specs = getattr(task, "view_specs", None) or []
                views.extend(
                    _view_specs_for_dataset(
                        specs, function_input.dataset_id
                    )
                )
            return ListViewsForDatasetOutput(
                success=True, views=views
            )
        except Exception as e:  # noqa: BLE001
            log.error(
                f"tasks_list_views_for_dataset failed: {e!s}"
            )
            return ListViewsForDatasetOutput(
                success=False, views=[], error=str(e)
            )
    return ListViewsForDatasetOutput(
        success=False, views=[], error="No db"
    )


@function.defn()
async def tasks_get_view_by_id(
    function_input: GetViewInput,
) -> GetViewOutput:
    """Get a single view spec by id that references the given dataset."""
    if isinstance(function_input, dict):
        function_input = GetViewInput.model_validate(
            function_input
        )
    async for db in get_async_db():
        try:
            tasks_query = select(Task).where(
                Task.workspace_id
                == uuid.UUID(function_input.workspace_id)
            )
            result = await db.execute(tasks_query)
            tasks = result.scalars().all()
            for task in tasks:
                specs = getattr(task, "view_specs", None) or []
                for v in _view_specs_for_dataset(
                    specs, function_input.dataset_id
                ):
                    if (
                        isinstance(v, dict)
                        and v.get("id") == function_input.view_id
                    ):
                        return GetViewOutput(success=True, view=v)
            return GetViewOutput(success=True, view=None)
        except Exception as e:  # noqa: BLE001
            log.error(f"tasks_get_view_by_id failed: {e!s}")
            return GetViewOutput(
                success=False, view=None, error=str(e)
            )
    return GetViewOutput(success=False, view=None, error="No db")


@function.defn()
async def tasks_get_by_parent_id(
    function_input: TaskGetByIdInput,
) -> TaskListOutput:
    """Get all subtasks for a parent task."""
    async for db in get_async_db():
        try:
            tasks_query = (
                select(Task)
                .options(
                    selectinload(Task.agent),
                    selectinload(Task.assigned_to_user),
                    selectinload(Task.team),
                )
                .where(
                    Task.parent_task_id
                    == uuid.UUID(function_input.task_id)
                )
                .order_by(Task.created_at.asc())
            )
            result = await db.execute(tasks_query)
            tasks = result.scalars().all()

            output_result = [
                TaskOutput(
                    id=str(task.id),
                    workspace_id=str(task.workspace_id),
                    team_id=str(task.team_id)
                    if task.team_id
                    else None,
                    team_name=task.team.name
                    if task.team
                    else None,
                    title=task.title,
                    description=task.description,
                    status=task.status,
                    agent_id=str(task.agent_id),
                    agent_name=task.agent.name
                    if task.agent
                    else "N/A",
                    parent_agent_id=str(
                        task.agent.parent_agent_id
                    )
                    if task.agent and task.agent.parent_agent_id
                    else None,
                    assigned_to_id=str(task.assigned_to_id)
                    if task.assigned_to_id
                    else None,
                    assigned_to_name=task.assigned_to_user.name
                    if task.assigned_to_user
                    else "N/A",
                    temporal_agent_id=task.temporal_agent_id,
                    parent_task_id=str(task.parent_task_id)
                    if task.parent_task_id
                    else None,
                    temporal_parent_agent_id=task.temporal_parent_agent_id,
                    schedule_spec=task.schedule_spec,
                    schedule_task_id=str(task.schedule_task_id)
                    if task.schedule_task_id
                    else None,
                    is_scheduled=task.is_scheduled,
                    schedule_status=task.schedule_status,
                    temporal_schedule_id=task.temporal_schedule_id,
                    task_metadata=task.task_metadata,
                    view_specs=task.view_specs
                    if getattr(task, "view_specs", None)
                    is not None
                    else [],
                    pattern_specs=task.pattern_specs
                    if getattr(task, "pattern_specs", None)
                    is not None
                    else {},
                    created_at=task.created_at.isoformat()
                    if task.created_at
                    else None,
                    updated_at=task.updated_at.isoformat()
                    if task.updated_at
                    else None,
                )
                for task in tasks
            ]

            return TaskListOutput(tasks=output_result)
        except Exception as e:
            msg = f"Error during tasks_get_by_parent_id: {e}"
            raise NonRetryableError(msg) from e
    return None


@function.defn()
async def tasks_get_by_status(
    function_input: TaskGetByStatusInput,
) -> TaskListOutput:
    """Get tasks by status."""
    async for db in get_async_db():
        try:
            tasks_query = (
                select(Task)
                .options(
                    selectinload(Task.agent),
                    selectinload(Task.assigned_to_user),
                    selectinload(Task.team),
                )
                .where(Task.status == function_input.status)
            )
            result = await db.execute(tasks_query)
            tasks = result.scalars().all()

            output_result = [
                TaskOutput(
                    id=str(task.id),
                    workspace_id=str(task.workspace_id),
                    team_id=str(task.team_id)
                    if task.team_id
                    else None,
                    team_name=task.team.name
                    if task.team
                    else None,
                    title=task.title,
                    description=task.description,
                    status=task.status,
                    agent_id=str(task.agent_id),
                    agent_name=task.agent.name
                    if task.agent
                    else "N/A",
                    parent_agent_id=str(
                        task.agent.parent_agent_id
                    )
                    if task.agent and task.agent.parent_agent_id
                    else None,
                    assigned_to_id=str(task.assigned_to_id)
                    if task.assigned_to_id
                    else None,
                    assigned_to_name=task.assigned_to_user.name
                    if task.assigned_to_user
                    else "N/A",
                    temporal_agent_id=task.temporal_agent_id,
                    # Subtask-related fields
                    parent_task_id=str(task.parent_task_id)
                    if task.parent_task_id
                    else None,
                    temporal_parent_agent_id=task.temporal_parent_agent_id,
                    # Schedule-related fields
                    schedule_spec=task.schedule_spec,
                    schedule_task_id=str(task.schedule_task_id)
                    if task.schedule_task_id
                    else None,
                    is_scheduled=task.is_scheduled,
                    schedule_status=task.schedule_status,
                    temporal_schedule_id=task.temporal_schedule_id,
                    task_metadata=task.task_metadata,
                    view_specs=task.view_specs
                    if getattr(task, "view_specs", None)
                    is not None
                    else [],
                    pattern_specs=task.pattern_specs
                    if getattr(task, "pattern_specs", None)
                    is not None
                    else {},
                    created_at=task.created_at.isoformat()
                    if task.created_at
                    else None,
                    updated_at=task.updated_at.isoformat()
                    if task.updated_at
                    else None,
                )
                for task in tasks
            ]

            return TaskListOutput(tasks=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get tasks by status: {e!s}"
            ) from e
    return None


@function.defn()
async def tasks_update_agent_task_id(
    function_input: TaskUpdateAgentTaskIdInput,
) -> TaskSingleOutput:
    """Update the temporal_agent_id for a task when the agent starts execution."""
    async for db in get_async_db():
        try:
            task_query = (
                select(Task)
                .options(
                    selectinload(Task.agent),
                    selectinload(Task.assigned_to_user),
                    selectinload(Task.team),
                )
                .where(
                    Task.id == uuid.UUID(function_input.task_id)
                )
            )
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                raise NonRetryableError(
                    message=f"Task with id {function_input.task_id} not found"
                )
            # Update the temporal_agent_id
            task.temporal_agent_id = (
                function_input.temporal_agent_id
            )

            await db.commit()
            await db.refresh(task)

            output_result = TaskOutput(
                id=str(task.id),
                workspace_id=str(task.workspace_id),
                team_id=str(task.team_id)
                if task.team_id
                else None,
                team_name=task.team.name if task.team else None,
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name
                if task.agent
                else "N/A",
                parent_agent_id=str(task.agent.parent_agent_id)
                if task.agent and task.agent.parent_agent_id
                else None,
                assigned_to_id=str(task.assigned_to_id)
                if task.assigned_to_id
                else None,
                assigned_to_name=task.assigned_to_user.name
                if task.assigned_to_user
                else None,
                temporal_agent_id=task.temporal_agent_id,
                agent_state=task.agent_state,
                # Subtask-related fields
                parent_task_id=str(task.parent_task_id)
                if task.parent_task_id
                else None,
                temporal_parent_agent_id=task.temporal_parent_agent_id,
                # Schedule-related fields
                schedule_spec=task.schedule_spec,
                schedule_task_id=str(task.schedule_task_id)
                if task.schedule_task_id
                else None,
                is_scheduled=task.is_scheduled,
                schedule_status=task.schedule_status,
                temporal_schedule_id=task.temporal_schedule_id,
                task_metadata=task.task_metadata,
                view_specs=task.view_specs
                if getattr(task, "view_specs", None) is not None
                else [],
                pattern_specs=task.pattern_specs
                if getattr(task, "pattern_specs", None)
                is not None
                else {},
                created_at=task.created_at.isoformat()
                if task.created_at
                else None,
                updated_at=task.updated_at.isoformat()
                if task.updated_at
                else None,
            )

            return TaskSingleOutput(task=output_result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to update temporal agent ID: {e!s}"
            ) from e
    return None


class TaskGetByMetadataInput(BaseModel):
    metadata_key: str = Field(..., min_length=1)
    metadata_value: str = Field(..., min_length=1)
    workspace_id: str | None = None


@function.defn()
async def tasks_get_by_metadata(
    function_input: TaskGetByMetadataInput,
) -> TaskSingleOutput | None:
    """Find a task by a metadata key-value pair (e.g., slack_thread_ts)."""
    async for db in get_async_db():
        try:
            query = (
                select(Task)
                .options(
                    selectinload(Task.agent),
                    selectinload(Task.assigned_to_user),
                    selectinload(Task.team),
                )
                .where(
                    Task.task_metadata[
                        function_input.metadata_key
                    ].astext
                    == function_input.metadata_value
                )
                .order_by(Task.created_at.desc())
                .limit(1)
            )

            if function_input.workspace_id:
                query = query.where(
                    Task.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )

            result = await db.execute(query)
            task = result.scalar_one_or_none()

            if not task:
                return None

            output_result = TaskOutput(
                id=str(task.id),
                workspace_id=str(task.workspace_id),
                team_id=str(task.team_id)
                if task.team_id
                else None,
                team_name=task.team.name if task.team else None,
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name
                if task.agent
                else "N/A",
                parent_agent_id=str(task.agent.parent_agent_id)
                if task.agent and task.agent.parent_agent_id
                else None,
                assigned_to_id=str(task.assigned_to_id)
                if task.assigned_to_id
                else None,
                assigned_to_name=task.assigned_to_user.name
                if task.assigned_to_user
                else None,
                temporal_agent_id=task.temporal_agent_id,
                agent_state=task.agent_state,
                parent_task_id=str(task.parent_task_id)
                if task.parent_task_id
                else None,
                temporal_parent_agent_id=task.temporal_parent_agent_id,
                schedule_spec=task.schedule_spec,
                schedule_task_id=str(task.schedule_task_id)
                if task.schedule_task_id
                else None,
                is_scheduled=task.is_scheduled,
                schedule_status=task.schedule_status,
                temporal_schedule_id=task.temporal_schedule_id,
                task_metadata=task.task_metadata,
                created_at=task.created_at.isoformat()
                if task.created_at
                else None,
                updated_at=task.updated_at.isoformat()
                if task.updated_at
                else None,
            )

            return TaskSingleOutput(task=output_result)
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to find task by metadata: {e!s}"
            ) from e
    return None


@function.defn()
async def tasks_get_stats(
    function_input: TaskGetByWorkspaceInput,
) -> TaskStatsOutput:
    """Get task statistics by status for a specific workspace."""
    async for db in get_async_db():
        try:
            # Query to count tasks by status
            stats_query = (
                select(
                    Task.status,
                    func.count(Task.id).label("count"),
                )
                .where(
                    Task.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
                .group_by(Task.status)
            )

            if function_input.team_id:
                stats_query = stats_query.where(
                    Task.team_id
                    == uuid.UUID(function_input.team_id)
                )

            if function_input.exclude_build_tasks:
                stats_query = stats_query.where(
                    Task.title != "Build"
                )

            result = await db.execute(stats_query)
            status_counts = result.all()

            # Initialize all statuses to 0
            stats = {
                "in_progress": 0,
                "in_review": 0,
                "closed": 0,
                "completed": 0,
            }

            # Update with actual counts
            total = 0
            for status, count in status_counts:
                if status in stats:
                    stats[status] = count
                    total += count

            return TaskStatsOutput(
                in_progress=stats["in_progress"],
                in_review=stats["in_review"],
                closed=stats["closed"],
                completed=stats["completed"],
                total=total,
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get task statistics: {e!s}"
            ) from e
    return None
