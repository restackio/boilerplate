import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field

from src.database.connection import get_db
from src.database.models import Workspace
from restack_ai.function import function

# Pydantic models for input validation
class WorkspaceCreateInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class WorkspaceUpdateInput(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)

class WorkspaceReadInput(BaseModel):
    user_id: str = Field(..., description="User ID to filter workspaces by permissions")

class WorkspaceOutput(BaseModel):
    id: str
    name: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class WorkspaceSingleOutput(BaseModel):
    workspace: WorkspaceOutput

class WorkspaceListOutput(BaseModel):
    workspaces: List[WorkspaceOutput]

@function.defn()
async def workspaces_read(input: WorkspaceReadInput) -> WorkspaceListOutput:
    """Read workspaces for a specific user based on their permissions"""
    db = next(get_db())
    try:
        # Filter workspaces by user permissions
        from ..database.models import UserWorkspace
        user_workspaces = db.query(UserWorkspace).filter(
            UserWorkspace.user_id == uuid.UUID(input.user_id)
        ).all()
        
        workspace_ids = [uw.workspace_id for uw in user_workspaces]
        workspaces = db.query(Workspace).filter(Workspace.id.in_(workspace_ids)).all()
        
        result = [
            WorkspaceOutput(
                id=str(workspace.id),
                name=workspace.name,
                created_at=workspace.created_at.isoformat() if workspace.created_at else None,
                updated_at=workspace.updated_at.isoformat() if workspace.updated_at else None,
            )
            for workspace in workspaces
        ]
        return WorkspaceListOutput(workspaces=result)
    finally:
        db.close()

@function.defn()
async def workspaces_create(workspace_data: WorkspaceCreateInput) -> WorkspaceSingleOutput:
    """Create a new workspace"""
    db = next(get_db())
    try:
        workspace_id = uuid.uuid4()
        workspace = Workspace(
            id=workspace_id,
            name=workspace_data.name,
        )
        
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        
        result = WorkspaceOutput(
            id=str(workspace.id),
            name=workspace.name,
            created_at=workspace.created_at.isoformat() if workspace.created_at else None,
            updated_at=workspace.updated_at.isoformat() if workspace.updated_at else None,
        )
        
        return WorkspaceSingleOutput(workspace=result)
    finally:
        db.close()

@function.defn()
async def workspaces_update(workspace_id: str, updates: WorkspaceUpdateInput) -> WorkspaceSingleOutput:
    """Update an existing workspace"""
    db = next(get_db())
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise ValueError(f"Workspace with id {workspace_id} not found")
        
        # Update fields (only non-None values)
        update_data = updates.dict(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(workspace, key):
                setattr(workspace, key, value)
        
        workspace.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(workspace)
        
        result = WorkspaceOutput(
            id=str(workspace.id),
            name=workspace.name,
            created_at=workspace.created_at.isoformat() if workspace.created_at else None,
            updated_at=workspace.updated_at.isoformat() if workspace.updated_at else None,
        )
        
        return WorkspaceSingleOutput(workspace=result)
    finally:
        db.close()

@function.defn()
async def workspaces_delete(workspace_id: str) -> Dict[str, bool]:
    """Delete a workspace"""
    db = next(get_db())
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise ValueError(f"Workspace with id {workspace_id} not found")
        
        db.delete(workspace)
        db.commit()
        
        return {"success": True}
    finally:
        db.close()

@function.defn()
async def workspaces_get_by_id(workspace_id: str) -> Optional[WorkspaceSingleOutput]:
    """Get a specific workspace by ID"""
    db = next(get_db())
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            return None
        
        result = WorkspaceOutput(
            id=str(workspace.id),
            name=workspace.name,
            created_at=workspace.created_at.isoformat() if workspace.created_at else None,
            updated_at=workspace.updated_at.isoformat() if workspace.updated_at else None,
        )
        
        return WorkspaceSingleOutput(workspace=result)
    finally:
        db.close() 