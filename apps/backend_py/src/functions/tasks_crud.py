import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from restack_ai.function import function, NonRetryableError
from pydantic import BaseModel, Field

from ..database.connection import SessionLocal
from ..database.models import Task, User, Workspace

# Pydantic models for input validation
class TaskCreateInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = Field(default="open", pattern="^(open|active|waiting|closed|completed)$")
    agent_id: str = Field(..., min_length=1)
    assigned_to: str = Field(..., min_length=1)  # This can be email or UUID

class TaskUpdateInput(BaseModel):
    task_id: str = Field(..., min_length=1)
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(open|active|waiting|closed|completed)$")
    agent_id: Optional[str] = Field(None, min_length=1)
    assigned_to: Optional[str] = Field(None, min_length=1)

class TaskGetByIdInput(BaseModel):
    task_id: str = Field(..., min_length=1)

class TaskGetByStatusInput(BaseModel):
    status: str = Field(..., pattern="^(open|active|waiting|closed|completed)$")

class TaskDeleteInput(BaseModel):
    task_id: str = Field(..., min_length=1)

# Pydantic models for output serialization
class TaskOutput(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    agent_id: str
    agent_name: str
    assigned_to_id: str
    assigned_to_name: str
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
async def tasks_read() -> TaskListOutput:
    """Read all tasks from database"""
    try:
        db = SessionLocal()
        tasks = db.query(Task).all()
        
        result = []
        for task in tasks:
            result.append(TaskOutput(
                id=str(task.id),
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name if task.agent else "N/A",
                assigned_to_id=str(task.assigned_to),
                assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
                created_at=task.created_at.isoformat() if task.created_at else None,
                updated_at=task.updated_at.isoformat() if task.updated_at else None,
            ))
        
        return TaskListOutput(tasks=result)
    except Exception as e:
        raise NonRetryableError(message=f"Database error: {str(e)}")
    finally:
        db.close()

@function.defn()
async def tasks_create(task_data: TaskCreateInput) -> TaskSingleOutput:
    """Create a new task"""
    try:
        db = SessionLocal()
        
        # Handle user assignment - support both email and UUID
        assigned_to_id = task_data.assigned_to
        
        # If assigned_to looks like an email, try to find the user by email
        if '@' in task_data.assigned_to:
            user = db.query(User).filter(User.email == task_data.assigned_to).first()
            if user:
                assigned_to_id = str(user.id)
            else:
                # If user not found by email, create a default user or use a fallback
                # For now, let's try to get the first user in the system
                default_user = db.query(User).first()
                if default_user:
                    assigned_to_id = str(default_user.id)
                else:
                    # If no users exist, create a default workspace and user
                    workspace = Workspace(
                        id=uuid.uuid4(),
                        name="Default Workspace",
                        plan="free"
                    )
                    db.add(workspace)
                    db.flush()  # Get the workspace ID
                    
                    default_user = User(
                        id=uuid.uuid4(),
                        workspace_id=workspace.id,
                        name="Default User",
                        email=task_data.assigned_to,
                        avatar_url=None
                    )
                    db.add(default_user)
                    db.flush()  # Get the user ID
                    assigned_to_id = str(default_user.id)
        
        # Create task with UUID
        task = Task(
            id=uuid.uuid4(),
            title=task_data.title,
            description=task_data.description,
            status=task_data.status,
            agent_id=uuid.UUID(task_data.agent_id),
            assigned_to=uuid.UUID(assigned_to_id),
        )
        
        db.add(task)
        db.commit()
        db.refresh(task)
        
        result = TaskOutput(
            id=str(task.id),
            title=task.title,
            description=task.description,
            status=task.status,
            agent_id=str(task.agent_id),
            agent_name=task.agent.name if task.agent else "N/A",
            assigned_to_id=str(task.assigned_to),
            assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
            created_at=task.created_at.isoformat() if task.created_at else None,
            updated_at=task.updated_at.isoformat() if task.updated_at else None,
        )
        
        return TaskSingleOutput(task=result)
    except Exception as e:
        db.rollback()
        raise NonRetryableError(message=f"Failed to create task: {str(e)}")
    finally:
        db.close()

@function.defn()
async def tasks_update(input: TaskUpdateInput) -> TaskSingleOutput:
    """Update an existing task"""
    try:
        db = SessionLocal()
        
        task = db.query(Task).filter(Task.id == uuid.UUID(input.task_id)).first()
        if not task:
            raise NonRetryableError(message=f"Task with id {input.task_id} not found")
        
        # Update fields (only non-None values, excluding task_id)
        update_data = input.dict(exclude_unset=True, exclude={'task_id'})
        for key, value in update_data.items():
            if hasattr(task, key):
                # Handle UUID fields
                if key == 'agent_id' and value:
                    setattr(task, key, uuid.UUID(value))
                elif key == 'assigned_to' and value:
                    # Handle user assignment - support both email and UUID
                    assigned_to_id = value
                    if '@' in value:
                        user = db.query(User).filter(User.email == value).first()
                        if user:
                            assigned_to_id = str(user.id)
                        else:
                            # Use first available user as fallback
                            default_user = db.query(User).first()
                            if default_user:
                                assigned_to_id = str(default_user.id)
                            else:
                                raise NonRetryableError(message=f"User with email {value} not found and no default user available")
                    setattr(task, key, uuid.UUID(assigned_to_id))
                else:
                    setattr(task, key, value)
        
        task.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(task)
        
        result = TaskOutput(
            id=str(task.id),
            title=task.title,
            description=task.description,
            status=task.status,
            agent_id=str(task.agent_id),
            agent_name=task.agent.name if task.agent else "N/A",
            assigned_to_id=str(task.assigned_to),
            assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
            created_at=task.created_at.isoformat() if task.created_at else None,
            updated_at=task.updated_at.isoformat() if task.updated_at else None,
        )
        
        return TaskSingleOutput(task=result)
    except Exception as e:
        db.rollback()
        raise NonRetryableError(message=f"Failed to update task: {str(e)}")
    finally:
        db.close()

@function.defn()
async def tasks_delete(input: TaskGetByIdInput) -> TaskDeleteOutput:
    """Delete a task"""
    try:
        db = SessionLocal()
        
        task = db.query(Task).filter(Task.id == uuid.UUID(input.task_id)).first()
        if not task:
            raise NonRetryableError(message=f"Task with id {input.task_id} not found")
        
        db.delete(task)
        db.commit()
        
        return TaskDeleteOutput(success=True)
    except Exception as e:
        db.rollback()
        raise NonRetryableError(message=f"Failed to delete task: {str(e)}")
    finally:
        db.close()

@function.defn()
async def tasks_get_by_id(input: TaskGetByIdInput) -> TaskSingleOutput:
    """Get task by ID"""
    try:
        db = SessionLocal()
        
        task = db.query(Task).filter(Task.id == uuid.UUID(input.task_id)).first()
        if not task:
            raise NonRetryableError(message=f"Task with id {input.task_id} not found")
        
        result = TaskOutput(
            id=str(task.id),
            title=task.title,
            description=task.description,
            status=task.status,
            agent_id=str(task.agent_id),
            agent_name=task.agent.name if task.agent else "N/A",
            assigned_to_id=str(task.assigned_to),
            assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
            created_at=task.created_at.isoformat() if task.created_at else None,
            updated_at=task.updated_at.isoformat() if task.updated_at else None,
        )
        
        return TaskSingleOutput(task=result)
    except Exception as e:
        raise NonRetryableError(message=f"Failed to get task: {str(e)}")
    finally:
        db.close()

@function.defn()
async def tasks_get_by_status(input: TaskGetByStatusInput) -> TaskListOutput:
    """Get tasks by status"""
    try:
        db = SessionLocal()
        
        tasks = db.query(Task).filter(Task.status == input.status).all()
        
        result = []
        for task in tasks:
            result.append(TaskOutput(
                id=str(task.id),
                title=task.title,
                description=task.description,
                status=task.status,
                agent_id=str(task.agent_id),
                agent_name=task.agent.name if task.agent else "N/A",
                assigned_to_id=str(task.assigned_to),
                assigned_to_name=task.assigned_to_user.name if task.assigned_to_user else "N/A",
                created_at=task.created_at.isoformat() if task.created_at else None,
                updated_at=task.updated_at.isoformat() if task.updated_at else None,
            ))
        
        return TaskListOutput(tasks=result)
    except Exception as e:
        raise NonRetryableError(message=f"Failed to get tasks by status: {str(e)}")
    finally:
        db.close()