import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from restack_ai.function import function, NonRetryableError
from pydantic import BaseModel, Field

from ..database.connection import get_db
from ..database.models import UserWorkspace, User, Workspace

# Pydantic models for input validation
class UserWorkspaceCreateInput(BaseModel):
    user_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)
    role: str = Field(default="member", pattern="^(owner|admin|member)$")

class UserWorkspaceUpdateInput(BaseModel):
    user_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)
    role: str = Field(..., pattern="^(owner|admin|member)$")

class UserWorkspaceDeleteInput(BaseModel):
    user_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)

class UserWorkspacesGetByUserInput(BaseModel):
    user_id: str = Field(..., min_length=1)

class UserWorkspacesGetByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)

# Pydantic models for output serialization
class UserWorkspaceOutput(BaseModel):
    id: str
    user_id: str
    workspace_id: str
    role: str
    created_at: Optional[str]
    user_name: str
    user_email: str
    workspace_name: str

    class Config:
        from_attributes = True

class UserWorkspaceListOutput(BaseModel):
    user_workspaces: List[UserWorkspaceOutput]

class UserWorkspaceSingleOutput(BaseModel):
    user_workspace: UserWorkspaceOutput

class UserWorkspaceDeleteOutput(BaseModel):
    success: bool

@function.defn()
async def user_workspaces_get_by_user(input: UserWorkspacesGetByUserInput) -> UserWorkspaceListOutput:
    """Get all workspaces for a specific user"""
    db = next(get_db())
    try:
        user_workspaces = db.query(UserWorkspace).filter(
            UserWorkspace.user_id == uuid.UUID(input.user_id)
        ).all()
        
        result = []
        for uw in user_workspaces:
            result.append(UserWorkspaceOutput(
                id=str(uw.id),
                user_id=str(uw.user_id),
                workspace_id=str(uw.workspace_id),
                role=uw.role,
                created_at=uw.created_at.isoformat() if uw.created_at else None,
                user_name=uw.user.name if uw.user else "N/A",
                user_email=uw.user.email if uw.user else "N/A",
                workspace_name=uw.workspace.name if uw.workspace else "N/A",
            ))
        
        return UserWorkspaceListOutput(user_workspaces=result)
    except Exception as e:
        raise NonRetryableError(message=f"Database error: {str(e)}")
    finally:
        db.close()

@function.defn()
async def user_workspaces_get_by_workspace(input: UserWorkspacesGetByWorkspaceInput) -> UserWorkspaceListOutput:
    """Get all users for a specific workspace"""
    db = next(get_db())
    try:
        user_workspaces = db.query(UserWorkspace).filter(
            UserWorkspace.workspace_id == uuid.UUID(input.workspace_id)
        ).all()
        
        result = []
        for uw in user_workspaces:
            result.append(UserWorkspaceOutput(
                id=str(uw.id),
                user_id=str(uw.user_id),
                workspace_id=str(uw.workspace_id),
                role=uw.role,
                created_at=uw.created_at.isoformat() if uw.created_at else None,
                user_name=uw.user.name if uw.user else "N/A",
                user_email=uw.user.email if uw.user else "N/A",
                workspace_name=uw.workspace.name if uw.workspace else "N/A",
            ))
        
        return UserWorkspaceListOutput(user_workspaces=result)
    except Exception as e:
        raise NonRetryableError(message=f"Database error: {str(e)}")
    finally:
        db.close()

@function.defn()
async def user_workspaces_create(input: UserWorkspaceCreateInput) -> UserWorkspaceSingleOutput:
    """Add a user to a workspace"""
    db = next(get_db())
    try:
        # Check if user and workspace exist
        user = db.query(User).filter(User.id == uuid.UUID(input.user_id)).first()
        if not user:
            raise NonRetryableError(message=f"User with id {input.user_id} not found")
        
        workspace = db.query(Workspace).filter(Workspace.id == uuid.UUID(input.workspace_id)).first()
        if not workspace:
            raise NonRetryableError(message=f"Workspace with id {input.workspace_id} not found")
        
        # Check if relationship already exists
        existing = db.query(UserWorkspace).filter(
            UserWorkspace.user_id == uuid.UUID(input.user_id),
            UserWorkspace.workspace_id == uuid.UUID(input.workspace_id)
        ).first()
        
        if existing:
            raise NonRetryableError(message="User is already a member of this workspace")
        
        user_workspace = UserWorkspace(
            id=uuid.uuid4(),
            user_id=uuid.UUID(input.user_id),
            workspace_id=uuid.UUID(input.workspace_id),
            role=input.role,
        )
        db.add(user_workspace)
        db.commit()
        db.refresh(user_workspace)
        
        result = UserWorkspaceOutput(
            id=str(user_workspace.id),
            user_id=str(user_workspace.user_id),
            workspace_id=str(user_workspace.workspace_id),
            role=user_workspace.role,
            created_at=user_workspace.created_at.isoformat() if user_workspace.created_at else None,
            user_name=user.name,
            user_email=user.email,
            workspace_name=workspace.name,
        )
        
        return UserWorkspaceSingleOutput(user_workspace=result)
    except Exception as e:
        db.rollback()
        raise NonRetryableError(message=f"Failed to add user to workspace: {str(e)}")
    finally:
        db.close()

@function.defn()
async def user_workspaces_update(input: UserWorkspaceUpdateInput) -> UserWorkspaceSingleOutput:
    """Update user role in workspace"""
    db = next(get_db())
    try:
        user_workspace = db.query(UserWorkspace).filter(
            UserWorkspace.user_id == uuid.UUID(input.user_id),
            UserWorkspace.workspace_id == uuid.UUID(input.workspace_id)
        ).first()
        
        if not user_workspace:
            raise NonRetryableError(message="User is not a member of this workspace")
        
        user_workspace.role = input.role
        db.commit()
        db.refresh(user_workspace)
        
        result = UserWorkspaceOutput(
            id=str(user_workspace.id),
            user_id=str(user_workspace.user_id),
            workspace_id=str(user_workspace.workspace_id),
            role=user_workspace.role,
            created_at=user_workspace.created_at.isoformat() if user_workspace.created_at else None,
            user_name=user_workspace.user.name if user_workspace.user else "N/A",
            user_email=user_workspace.user.email if user_workspace.user else "N/A",
            workspace_name=user_workspace.workspace.name if user_workspace.workspace else "N/A",
        )
        
        return UserWorkspaceSingleOutput(user_workspace=result)
    except Exception as e:
        db.rollback()
        raise NonRetryableError(message=f"Failed to update user workspace: {str(e)}")
    finally:
        db.close()

@function.defn()
async def user_workspaces_delete(input: UserWorkspaceDeleteInput) -> UserWorkspaceDeleteOutput:
    """Remove a user from a workspace"""
    db = next(get_db())
    try:
        user_workspace = db.query(UserWorkspace).filter(
            UserWorkspace.user_id == uuid.UUID(input.user_id),
            UserWorkspace.workspace_id == uuid.UUID(input.workspace_id)
        ).first()
        
        if not user_workspace:
            raise NonRetryableError(message="User is not a member of this workspace")
        
        db.delete(user_workspace)
        db.commit()
        
        return UserWorkspaceDeleteOutput(success=True)
    except Exception as e:
        db.rollback()
        raise NonRetryableError(message=f"Failed to remove user from workspace: {str(e)}")
    finally:
        db.close() 