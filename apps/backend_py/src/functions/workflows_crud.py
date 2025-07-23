import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field

from src.database.connection import get_db
from src.database.models import Workflow, WorkflowExecution

# Pydantic models for input validation
class WorkflowCreateInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    workflow_type: str = Field(..., pattern="^(agent|task|custom|system)$")
    status: str = Field(default="active", pattern="^(active|inactive|draft|archived)$")
    version: str = Field(default="v1.0", max_length=50)
    config: Optional[Dict[str, Any]] = None

class WorkflowUpdateInput(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    workflow_type: Optional[str] = Field(None, pattern="^(agent|task|custom|system)$")
    status: Optional[str] = Field(None, pattern="^(active|inactive|draft|archived)$")
    version: Optional[str] = Field(None, max_length=50)
    config: Optional[Dict[str, Any]] = None

class WorkflowGetByIdInput(BaseModel):
    workflow_id: str = Field(..., min_length=1)

class WorkflowGetByTypeInput(BaseModel):
    workflow_type: str = Field(..., pattern="^(agent|task|custom|system)$")

class WorkflowGetByStatusInput(BaseModel):
    status: str = Field(..., pattern="^(active|inactive|draft|archived)$")

class WorkflowDeleteInput(BaseModel):
    workflow_id: str = Field(..., min_length=1)

class WorkflowExecutionCreateInput(BaseModel):
    workflow_id: str = Field(..., min_length=1)
    restack_run_id: str = Field(..., min_length=1)
    status: str = Field(default="running", pattern="^(running|completed|failed|cancelled|timeout)$")
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None

class WorkflowExecutionUpdateInput(BaseModel):
    status: Optional[str] = Field(None, pattern="^(running|completed|failed|cancelled|timeout)$")
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None

class WorkflowExecutionGetByWorkflowInput(BaseModel):
    workflow_id: str = Field(..., min_length=1)

# Pydantic models for output serialization
class WorkflowOutput(BaseModel):
    id: str
    name: str
    description: Optional[str]
    workflow_type: str
    status: str
    version: str
    config: Optional[Dict[str, Any]]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True

class WorkflowListOutput(BaseModel):
    workflows: List[WorkflowOutput]

class WorkflowSingleOutput(BaseModel):
    workflow: WorkflowOutput

class WorkflowDeleteOutput(BaseModel):
    success: bool

class WorkflowExecutionOutput(BaseModel):
    id: str
    workflow_id: str
    restack_run_id: str
    status: str
    input_data: Optional[Dict[str, Any]]
    output_data: Optional[Dict[str, Any]]
    error_message: Optional[str]
    execution_time_ms: Optional[int]
    created_at: Optional[str]
    completed_at: Optional[str]

    class Config:
        from_attributes = True

class WorkflowExecutionListOutput(BaseModel):
    executions: List[WorkflowExecutionOutput]

class WorkflowExecutionSingleOutput(BaseModel):
    execution: WorkflowExecutionOutput

async def workflows_read() -> WorkflowListOutput:
    """Read all workflows"""
    db = next(get_db())
    try:
        workflows = db.query(Workflow).all()
        result = [
            WorkflowOutput(
                id=str(workflow.id),
                name=workflow.name,
                description=workflow.description,
                workflow_type=workflow.workflow_type,
                status=workflow.status,
                version=workflow.version,
                config=workflow.config,
                created_at=workflow.created_at.isoformat() if workflow.created_at else None,
                updated_at=workflow.updated_at.isoformat() if workflow.updated_at else None,
            )
            for workflow in workflows
        ]
        return WorkflowListOutput(workflows=result)
    finally:
        db.close()


async def workflows_create(workflow_data: WorkflowCreateInput) -> WorkflowSingleOutput:
    """Create a new workflow"""
    db = next(get_db())
    try:
        workflow_id = uuid.uuid4()
        workflow = Workflow(
            id=workflow_id,
            name=workflow_data.name,
            description=workflow_data.description,
            workflow_type=workflow_data.workflow_type,
            status=workflow_data.status,
            version=workflow_data.version,
            config=workflow_data.config or {},
        )
        
        db.add(workflow)
        db.commit()
        db.refresh(workflow)
        
        result = WorkflowOutput(
            id=str(workflow.id),
            name=workflow.name,
            description=workflow.description,
            workflow_type=workflow.workflow_type,
            status=workflow.status,
            version=workflow.version,
            config=workflow.config,
            created_at=workflow.created_at.isoformat() if workflow.created_at else None,
            updated_at=workflow.updated_at.isoformat() if workflow.updated_at else None,
        )
        
        return WorkflowSingleOutput(workflow=result)
    finally:
        db.close()


async def workflows_update(workflow_id: str, updates: WorkflowUpdateInput) -> WorkflowSingleOutput:
    """Update an existing workflow"""
    db = next(get_db())
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            raise ValueError(f"Workflow with id {workflow_id} not found")
        
        # Update fields (only non-None values)
        update_data = updates.dict(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(workflow, key):
                setattr(workflow, key, value)
        
        workflow.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(workflow)
        
        result = WorkflowOutput(
            id=str(workflow.id),
            name=workflow.name,
            description=workflow.description,
            workflow_type=workflow.workflow_type,
            status=workflow.status,
            version=workflow.version,
            config=workflow.config,
            created_at=workflow.created_at.isoformat() if workflow.created_at else None,
            updated_at=workflow.updated_at.isoformat() if workflow.updated_at else None,
        )
        
        return WorkflowSingleOutput(workflow=result)
    finally:
        db.close()


async def workflows_delete(workflow_id: str) -> WorkflowDeleteOutput:
    """Delete a workflow"""
    db = next(get_db())
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            raise ValueError(f"Workflow with id {workflow_id} not found")
        
        db.delete(workflow)
        db.commit()
        return WorkflowDeleteOutput(success=True)
    finally:
        db.close()


async def workflows_get_by_id(workflow_id: str) -> Optional[WorkflowSingleOutput]:
    """Get a specific workflow by ID"""
    db = next(get_db())
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            return None
        
        result = WorkflowOutput(
            id=str(workflow.id),
            name=workflow.name,
            description=workflow.description,
            workflow_type=workflow.workflow_type,
            status=workflow.status,
            version=workflow.version,
            config=workflow.config,
            created_at=workflow.created_at.isoformat() if workflow.created_at else None,
            updated_at=workflow.updated_at.isoformat() if workflow.updated_at else None,
        )
        
        return WorkflowSingleOutput(workflow=result)
    finally:
        db.close()


async def workflows_get_by_type(workflow_type: str) -> WorkflowListOutput:
    """Get workflows by type"""
    db = next(get_db())
    try:
        workflows = db.query(Workflow).filter(Workflow.workflow_type == workflow_type).all()
        result = [
            WorkflowOutput(
                id=str(workflow.id),
                name=workflow.name,
                description=workflow.description,
                workflow_type=workflow.workflow_type,
                status=workflow.status,
                version=workflow.version,
                config=workflow.config,
                created_at=workflow.created_at.isoformat() if workflow.created_at else None,
                updated_at=workflow.updated_at.isoformat() if workflow.updated_at else None,
            )
            for workflow in workflows
        ]
        return WorkflowListOutput(workflows=result)
    finally:
        db.close()


async def workflows_get_by_status(status: str) -> WorkflowListOutput:
    """Get workflows by status"""
    db = next(get_db())
    try:
        workflows = db.query(Workflow).filter(Workflow.status == status).all()
        result = [
            WorkflowOutput(
                id=str(workflow.id),
                name=workflow.name,
                description=workflow.description,
                workflow_type=workflow.workflow_type,
                status=workflow.status,
                version=workflow.version,
                config=workflow.config,
                created_at=workflow.created_at.isoformat() if workflow.created_at else None,
                updated_at=workflow.updated_at.isoformat() if workflow.updated_at else None,
            )
            for workflow in workflows
        ]
        return WorkflowListOutput(workflows=result)
    finally:
        db.close()


# Workflow Execution CRUD functions
async def workflow_executions_create(execution_data: WorkflowExecutionCreateInput) -> WorkflowExecutionSingleOutput:
    """Create a new workflow execution record"""
    db = next(get_db())
    try:
        execution_id = uuid.uuid4()
        execution = WorkflowExecution(
            id=execution_id,
            workflow_id=execution_data.workflow_id,
            restack_run_id=execution_data.restack_run_id,
            status=execution_data.status,
            input_data=execution_data.input_data or {},
            output_data=execution_data.output_data or {},
            error_message=execution_data.error_message,
            execution_time_ms=execution_data.execution_time_ms,
        )
        
        db.add(execution)
        db.commit()
        db.refresh(execution)
        
        result = WorkflowExecutionOutput(
            id=str(execution.id),
            workflow_id=execution.workflow_id,
            restack_run_id=execution.restack_run_id,
            status=execution.status,
            input_data=execution.input_data,
            output_data=execution.output_data,
            error_message=execution.error_message,
            execution_time_ms=execution.execution_time_ms,
            created_at=execution.created_at.isoformat() if execution.created_at else None,
            completed_at=execution.completed_at.isoformat() if execution.completed_at else None,
        )
        
        return WorkflowExecutionSingleOutput(execution=result)
    finally:
        db.close()


async def workflow_executions_update(execution_id: str, updates: WorkflowExecutionUpdateInput) -> WorkflowExecutionSingleOutput:
    """Update a workflow execution record"""
    db = next(get_db())
    try:
        execution = db.query(WorkflowExecution).filter(WorkflowExecution.id == execution_id).first()
        if not execution:
            raise ValueError(f"Workflow execution with id {execution_id} not found")
        
        # Update fields (only non-None values)
        update_data = updates.dict(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(execution, key):
                setattr(execution, key, value)
        
        # Set completed_at if status is completed or failed
        if updates.status in ["completed", "failed", "cancelled", "timeout"]:
            execution.completed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(execution)
        
        result = WorkflowExecutionOutput(
            id=str(execution.id),
            workflow_id=execution.workflow_id,
            restack_run_id=execution.restack_run_id,
            status=execution.status,
            input_data=execution.input_data,
            output_data=execution.output_data,
            error_message=execution.error_message,
            execution_time_ms=execution.execution_time_ms,
            created_at=execution.created_at.isoformat() if execution.created_at else None,
            completed_at=execution.completed_at.isoformat() if execution.completed_at else None,
        )
        
        return WorkflowExecutionSingleOutput(execution=result)
    finally:
        db.close()


async def workflow_executions_get_by_workflow_id(workflow_id: str) -> WorkflowExecutionListOutput:
    """Get all executions for a specific workflow"""
    db = next(get_db())
    try:
        executions = db.query(WorkflowExecution).filter(WorkflowExecution.workflow_id == workflow_id).all()
        result = [
            WorkflowExecutionOutput(
                id=str(execution.id),
                workflow_id=execution.workflow_id,
                restack_run_id=execution.restack_run_id,
                status=execution.status,
                input_data=execution.input_data,
                output_data=execution.output_data,
                error_message=execution.error_message,
                execution_time_ms=execution.execution_time_ms,
                created_at=execution.created_at.isoformat() if execution.created_at else None,
                completed_at=execution.completed_at.isoformat() if execution.completed_at else None,
            )
            for execution in executions
        ]
        return WorkflowExecutionListOutput(executions=result)
    finally:
        db.close() 