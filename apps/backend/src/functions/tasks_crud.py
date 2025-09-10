import uuid

from pydantic import BaseModel, Field, field_validator
from restack_ai.function import NonRetryableError, function
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.database.connection import get_async_db
from src.database.models import Task


# Pydantic models for input validation
class TaskCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    status: str = Field(
        default="open",
        pattern="^(open|active|waiting|closed|completed)$",
    )
    agent_id: str | None = None
    agent_name: str | None = None
    assigned_to_id: str | None = None
    agent_task_id: str | None = None
    # Schedule-related fields
    schedule_spec: dict | None = None
    schedule_task_id: str | None = None
    is_scheduled: bool = False
    schedule_status: str | None = Field(
        None, pattern="^(active|inactive|paused)$"
    )
    restack_schedule_id: str | None = None


class TaskUpdateInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = Field(
        None, pattern="^(open|active|waiting|closed|completed)$"
    )
    agent_id: str | None = None
    assigned_to_id: str | None = None
    agent_task_id: str | None = None
    messages: list | None = None
    # Schedule-related fields
    schedule_spec: dict | None = None
    schedule_task_id: str | None = None
    is_scheduled: bool | None = None
    schedule_status: str | None = Field(
        None, pattern="^(active|inactive|paused)$"
    )
    restack_schedule_id: str | None = None
    
    @field_validator('assigned_to_id', 'agent_id', 'schedule_task_id', mode='before')
    @classmethod
    def validate_optional_string_fields(cls, v):
        """Convert empty strings to None for optional UUID fields"""
        if v == "":
            return None
        return v


class TaskGetByIdInput(BaseModel):
    task_id: str = Field(..., min_length=1)


class TaskGetByStatusInput(BaseModel):
    status: str = Field(
        ..., pattern="^(open|active|waiting|closed|completed)$"
    )


class TaskDeleteInput(BaseModel):
    task_id: str = Field(..., min_length=1)


class TaskUpdateAgentTaskIdInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    agent_task_id: str = Field(..., min_length=1)


class TaskGetByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)


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
    assigned_to_id: str | None
    assigned_to_name: str | None
    agent_task_id: str | None
    messages: list | None = None
    # Schedule-related fields
    schedule_spec: dict | None = None
    schedule_task_id: str | None = None
    is_scheduled: bool = False
    schedule_status: str | None = None
    restack_schedule_id: str | None = None
    created_at: str | None
    updated_at: str | None

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class TaskListOutput(BaseModel):
    tasks: list[TaskOutput]


class TaskSingleOutput(BaseModel):
    task: TaskOutput


class TaskDeleteOutput(BaseModel):
    success: bool


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
            result = await db.execute(tasks_query)
            tasks = result.scalars().all()

            output_result = []
            for task in tasks:
                output_result.append(  # noqa: PERF401
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
                        assigned_to_id=str(task.assigned_to_id)
                        if task.assigned_to_id
                        else None,
                        assigned_to_name=task.assigned_to_user.name
                        if task.assigned_to_user
                        else "N/A",
                        agent_task_id=task.agent_task_id,
                        # Schedule-related fields
                        schedule_spec=task.schedule_spec,
                        schedule_task_id=str(
                            task.schedule_task_id
                        )
                        if task.schedule_task_id
                        else None,
                        is_scheduled=task.is_scheduled,
                        schedule_status=task.schedule_status,
                        restack_schedule_id=task.restack_schedule_id,
                        created_at=task.created_at.isoformat()
                        if task.created_at
                        else None,
                        updated_at=task.updated_at.isoformat()
                        if task.updated_at
                        else None,
                    )
                )

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
    async for db in get_async_db():
        try:
            # Create task with UUID
            task = Task(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(task_data.workspace_id),
                title=task_data.title,
                description=task_data.description,
                status=task_data.status,
                agent_id=uuid.UUID(task_data.agent_id),
                assigned_to_id=uuid.UUID(task_data.assigned_to_id)
                if task_data.assigned_to_id
                else None,
                agent_task_id=task_data.agent_task_id,
                # Schedule-related fields
                schedule_spec=task_data.schedule_spec,
                schedule_task_id=uuid.UUID(
                    task_data.schedule_task_id
                )
                if task_data.schedule_task_id
                else None,
                is_scheduled=task_data.is_scheduled,
                schedule_status=task_data.schedule_status,
                restack_schedule_id=task_data.restack_schedule_id,
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
                assigned_to_id=str(task.assigned_to_id)
                if task.assigned_to_id
                else None,
                assigned_to_name=task.assigned_to_user.name
                if task.assigned_to_user
                else None,
                agent_task_id=task.agent_task_id,
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
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Task with id {function_input.task_id} not found"
                )
            # Update fields (only non-None values, excluding task_id)
            update_data = function_input.dict(
                exclude_unset=True, exclude={"task_id"}
            )
            for key, value in update_data.items():
                if hasattr(task, key) and value is not None:
                    # Handle UUID fields
                    if (
                        (key == "agent_id" and value)
                        or (key == "assigned_to_id" and value)
                        or (key == "schedule_task_id" and value)
                    ):
                        setattr(task, key, uuid.UUID(value))
                    elif key == "messages" and value is not None:
                        setattr(task, key, value)
                    elif key == "schedule_spec" and value is not None:
                        setattr(task, key, value)
                    elif key in ["is_scheduled", "schedule_status", "restack_schedule_id"] and value is not None:
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
                assigned_to_id=str(task.assigned_to_id)
                if task.assigned_to_id
                else None,
                assigned_to_name=task.assigned_to_user.name
                if task.assigned_to_user
                else None,
                agent_task_id=task.agent_task_id,
                messages=task.messages,
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
                raise NonRetryableError(  # noqa: TRY301
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
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()

            if not task:
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Task with id {function_input.task_id} not found"
                )
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
                assigned_to_id=str(task.assigned_to_id)
                if task.assigned_to_id
                else None,
                assigned_to_name=task.assigned_to_user.name
                if task.assigned_to_user
                else None,
                agent_task_id=task.agent_task_id,
                messages=task.messages,
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
                message=f"Failed to get task: {e!s}"
            ) from e
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

            output_result = []
            for task in tasks:
                output_result.append(  # noqa: PERF401
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
                        assigned_to_id=str(task.assigned_to_id)
                        if task.assigned_to_id
                        else None,
                        assigned_to_name=task.assigned_to_user.name
                        if task.assigned_to_user
                        else "N/A",
                        agent_task_id=task.agent_task_id,
                        # Schedule-related fields
                        schedule_spec=task.schedule_spec,
                        schedule_task_id=str(
                            task.schedule_task_id
                        )
                        if task.schedule_task_id
                        else None,
                        is_scheduled=task.is_scheduled,
                        schedule_status=task.schedule_status,
                        restack_schedule_id=task.restack_schedule_id,
                        created_at=task.created_at.isoformat()
                        if task.created_at
                        else None,
                        updated_at=task.updated_at.isoformat()
                        if task.updated_at
                        else None,
                    )
                )

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
    """Update the agent_task_id for a task when the agent starts execution."""
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
                raise NonRetryableError(  # noqa: TRY301
                    message=f"Task with id {function_input.task_id} not found"
                )
            # Update the agent_task_id
            task.agent_task_id = function_input.agent_task_id

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
                assigned_to_id=str(task.assigned_to_id)
                if task.assigned_to_id
                else None,
                assigned_to_name=task.assigned_to_user.name
                if task.assigned_to_user
                else None,
                agent_task_id=task.agent_task_id,
                messages=task.messages,
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
                message=f"Failed to update agent task ID: {e!s}"
            ) from e
    return None
