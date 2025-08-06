import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from restack_ai.function import function, NonRetryableError
from pydantic import BaseModel, Field

from ..database.connection import get_async_db
from ..database.models import Task, User, Workspace

# Pydantic models for input validation
class TaskCreateInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    status: str = Field(default="open", pattern="^(open|active|waiting|closed|completed)$")
    agent_id: str = Field(..., min_length=1)
    assigned_to_id: str = Field(..., min_length=1)  # This can be email or UUID
    agent_task_id: Optional[str] = None  # Restack agent task ID

class TaskUpdateInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(open|active|waiting|closed|completed)$")
    agent_id: Optional[str] = Field(None, min_length=1)
    assigned_to_id: Optional[str] = Field(None, min_length=1)
    agent_task_id: Optional[str] = None  # Restack agent task ID

class TaskGetByIdInput(BaseModel):
    task_id: str = Field(..., min_length=1)

class TaskGetByStatusInput(BaseModel):
    status: str = Field(..., pattern="^(open|active|waiting|closed|completed)$")

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
    title: str
    description: Optional[str]
    status: str
    agent_id: str
    agent_name: str
    assigned_to_id: str
    assigned_to_name: str
    agent_task_id: Optional[str]  # Restack agent task ID
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True

class TaskListOutput(BaseModel):
    tasks: List[TaskOutput]

class TaskSingleOutput(BaseModel):
    task: TaskOutput

class TaskDeleteOutput(BaseModel):
    success: bool

@function.defn()
async def tasks_read(input: TaskGetByWorkspaceInput) -> TaskListOutput:
    """Read all tasks from database for a specific workspace"""
    async for db in get_async_db():
        try:
            tasks_query = select(Task).options(
                selectinload(Task.agent),
                selectinload(Task.assigned_to_user)
            ).where(Task.workspace_id == uuid.UUID(input.workspace_id))
            result = await db.execute(tasks_query)
            tasks = result.scalars().all()
            
            output_result = []
            for task in tasks:
                output_result.append(TaskOutput(
                    id=str(task.id),
                    workspace_id=str(task.workspace_id),
                    title=task.title,
                    description=task.description,
                    status=task.status,
                    agent_id=str(task.agent_id),
                    agent_name=task.agent.name if task.agent else "N/A",
                    assigned_to_id=str(task.assigned_to_id),
                    assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
                    agent_task_id=task.agent_task_id,
                    created_at=task.created_at.isoformat() if task.created_at else None,
                    updated_at=task.updated_at.isoformat() if task.updated_at else None,
                ))
            
            return TaskListOutput(tasks=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Database error: {str(e)}")

@function.defn()
async def tasks_create(task_data: TaskCreateInput) -> TaskSingleOutput:
    """Create a new task"""
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
                assigned_to_id=uuid.UUID(task_data.assigned_to_id),
                agent_task_id=task_data.agent_task_id,
            )
            
            db.add(task)
            await db.commit()
            await db.refresh(task)
            
            # Load the related data for output
            await db.refresh(task, ['agent', 'assigned_to_user'])
            
            result = TaskOutput(
                id=str(task.id),
                workspace_id=str(task.workspace_id),
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name if task.agent else "N/A",
                assigned_to_id=str(task.assigned_to_id),
                assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
                agent_task_id=task.agent_task_id,
                created_at=task.created_at.isoformat() if task.created_at else None,
                updated_at=task.updated_at.isoformat() if task.updated_at else None,
            )
            
            return TaskSingleOutput(task=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to create task: {str(e)}")

@function.defn()
async def tasks_update(input: TaskUpdateInput) -> TaskSingleOutput:
    """Update an existing task"""
    async for db in get_async_db():
        try:
            task_query = select(Task).where(Task.id == uuid.UUID(input.task_id))
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()
            
            if not task:
                raise NonRetryableError(message=f"Task with id {input.task_id} not found")
            
            # Update fields (only non-None values, excluding task_id)
            update_data = input.dict(exclude_unset=True, exclude={'task_id'})
            for key, value in update_data.items():
                if hasattr(task, key):
                    # Handle UUID fields
                    if key == 'agent_id' and value:
                        setattr(task, key, uuid.UUID(value))
                    elif key == 'assigned_to_id' and value:
                        setattr(task, key, uuid.UUID(value))
                    elif key == 'agent_task_id' and value:
                        setattr(task, key, value)
                    else:
                        setattr(task, key, value)
            
            task.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(task)
            
            # Load the related data for output
            await db.refresh(task, ['agent', 'assigned_to_user'])
            
            result = TaskOutput(
                id=str(task.id),
                workspace_id=str(task.workspace_id),
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name if task.agent else "N/A",
                assigned_to_id=str(task.assigned_to_id),
                assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
                agent_task_id=task.agent_task_id,
                created_at=task.created_at.isoformat() if task.created_at else None,
                updated_at=task.updated_at.isoformat() if task.updated_at else None,
            )
            
            return TaskSingleOutput(task=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to update task: {str(e)}")

@function.defn()
async def tasks_delete(input: TaskGetByIdInput) -> TaskDeleteOutput:
    """Delete a task"""
    async for db in get_async_db():
        try:
            task_query = select(Task).where(Task.id == uuid.UUID(input.task_id))
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()
            
            if not task:
                raise NonRetryableError(message=f"Task with id {input.task_id} not found")
            
            await db.delete(task)
            await db.commit()
            
            return TaskDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to delete task: {str(e)}")

@function.defn()
async def tasks_get_by_id(input: TaskGetByIdInput) -> TaskSingleOutput:
    """Get task by ID"""
    async for db in get_async_db():
        try:
            task_query = select(Task).options(
                selectinload(Task.agent),
                selectinload(Task.assigned_to_user)
            ).where(Task.id == uuid.UUID(input.task_id))
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()
            
            if not task:
                raise NonRetryableError(message=f"Task with id {input.task_id} not found")
            
            output_result = TaskOutput(
                id=str(task.id),
                workspace_id=str(task.workspace_id),
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name if task.agent else "N/A",
                assigned_to_id=str(task.assigned_to_id),
                assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
                agent_task_id=task.agent_task_id,
                created_at=task.created_at.isoformat() if task.created_at else None,
                updated_at=task.updated_at.isoformat() if task.updated_at else None,
            )
            
            return TaskSingleOutput(task=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Failed to get task: {str(e)}")

@function.defn()
async def tasks_get_by_status(input: TaskGetByStatusInput) -> TaskListOutput:
    """Get tasks by status"""
    async for db in get_async_db():
        try:
            tasks_query = select(Task).options(
                selectinload(Task.agent),
                selectinload(Task.assigned_to_user)
            ).where(Task.status == input.status)
            result = await db.execute(tasks_query)
            tasks = result.scalars().all()
            
            output_result = []
            for task in tasks:
                output_result.append(TaskOutput(
                    id=str(task.id),
                    workspace_id=str(task.workspace_id),
                    title=task.title,
                    description=task.description,
                    status=task.status,
                    agent_id=str(task.agent_id),
                    agent_name=task.agent.name if task.agent else "N/A",
                    assigned_to_id=str(task.assigned_to_id),
                    assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
                    agent_task_id=task.agent_task_id,
                    created_at=task.created_at.isoformat() if task.created_at else None,
                    updated_at=task.updated_at.isoformat() if task.updated_at else None,
                ))
            
            return TaskListOutput(tasks=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Failed to get tasks by status: {str(e)}")

@function.defn()
async def tasks_update_agent_task_id(input: TaskUpdateAgentTaskIdInput) -> TaskSingleOutput:
    """Update the agent_task_id for a task when the agent starts execution"""
    async for db in get_async_db():
        try:
            task_query = select(Task).options(
                selectinload(Task.agent),
                selectinload(Task.assigned_to_user)
            ).where(Task.id == uuid.UUID(input.task_id))
            result = await db.execute(task_query)
            task = result.scalar_one_or_none()
            
            if not task:
                raise NonRetryableError(message=f"Task with id {input.task_id} not found")
            
            # Update the agent_task_id
            task.agent_task_id = input.agent_task_id
            task.updated_at = datetime.utcnow()
            
            await db.commit()
            await db.refresh(task)
            
            output_result = TaskOutput(
                id=str(task.id),
                workspace_id=str(task.workspace_id),
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name if task.agent else "N/A",
                assigned_to_id=str(task.assigned_to_id),
                assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
                agent_task_id=task.agent_task_id,
                created_at=task.created_at.isoformat() if task.created_at else None,
                updated_at=task.updated_at.isoformat() if task.updated_at else None,
            )
            
            return TaskSingleOutput(task=output_result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to update agent task ID: {str(e)}")