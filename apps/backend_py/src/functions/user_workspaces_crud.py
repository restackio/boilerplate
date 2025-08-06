import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from restack_ai.function import function, NonRetryableError
from pydantic import BaseModel, Field

from ..database.connection import get_async_db
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
    async for db in get_async_db():
        try:
            user_workspaces_query = select(UserWorkspace).options(
                selectinload(UserWorkspace.user),
                selectinload(UserWorkspace.workspace)
            ).where(
                UserWorkspace.user_id == uuid.UUID(input.user_id)
            )
            result = await db.execute(user_workspaces_query)
            user_workspaces = result.scalars().all()
            
            output_result = []
            for uw in user_workspaces:
                output_result.append(UserWorkspaceOutput(
                    id=str(uw.id),
                    user_id=str(uw.user_id),
                    workspace_id=str(uw.workspace_id),
                    role=uw.role,
                    created_at=uw.created_at.isoformat() if uw.created_at else None,
                    user_name=uw.user.name if uw.user else "N/A",
                    user_email=uw.user.email if uw.user else "N/A",
                    workspace_name=uw.workspace.name if uw.workspace else "N/A",
                ))
            
            return UserWorkspaceListOutput(user_workspaces=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Database error: {str(e)}")

@function.defn()
async def user_workspaces_get_by_workspace(input: UserWorkspacesGetByWorkspaceInput) -> UserWorkspaceListOutput:
    """Get all users for a specific workspace"""
    async for db in get_async_db():
        try:
            user_workspaces_query = select(UserWorkspace).options(
                selectinload(UserWorkspace.user),
                selectinload(UserWorkspace.workspace)
            ).where(
                UserWorkspace.workspace_id == uuid.UUID(input.workspace_id)
            )
            result = await db.execute(user_workspaces_query)
            user_workspaces = result.scalars().all()
            
            output_result = []
            for uw in user_workspaces:
                output_result.append(UserWorkspaceOutput(
                    id=str(uw.id),
                    user_id=str(uw.user_id),
                    workspace_id=str(uw.workspace_id),
                    role=uw.role,
                    created_at=uw.created_at.isoformat() if uw.created_at else None,
                    user_name=uw.user.name if uw.user else "N/A",
                    user_email=uw.user.email if uw.user else "N/A",
                    workspace_name=uw.workspace.name if uw.workspace else "N/A",
                ))
            
            return UserWorkspaceListOutput(user_workspaces=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Database error: {str(e)}")

@function.defn()
async def user_workspaces_create(input: UserWorkspaceCreateInput) -> UserWorkspaceSingleOutput:
    """Add a user to a workspace"""
    async for db in get_async_db():
        try:
            # Check if user and workspace exist
            user_query = select(User).where(User.id == uuid.UUID(input.user_id))
            user_result = await db.execute(user_query)
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise NonRetryableError(message=f"User with id {input.user_id} not found")
            
            workspace_query = select(Workspace).where(Workspace.id == uuid.UUID(input.workspace_id))
            workspace_result = await db.execute(workspace_query)
            workspace = workspace_result.scalar_one_or_none()
            
            if not workspace:
                raise NonRetryableError(message=f"Workspace with id {input.workspace_id} not found")
            
            # Check if relationship already exists
            existing_query = select(UserWorkspace).where(
                UserWorkspace.user_id == uuid.UUID(input.user_id),
                UserWorkspace.workspace_id == uuid.UUID(input.workspace_id)
            )
            existing_result = await db.execute(existing_query)
            existing = existing_result.scalar_one_or_none()
            
            if existing:
                raise NonRetryableError(message="User is already a member of this workspace")
            
            user_workspace = UserWorkspace(
                id=uuid.uuid4(),
                user_id=uuid.UUID(input.user_id),
                workspace_id=uuid.UUID(input.workspace_id),
                role=input.role,
            )
            db.add(user_workspace)
            await db.commit()
            await db.refresh(user_workspace)
            
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
            await db.rollback()
            raise NonRetryableError(message=f"Failed to add user to workspace: {str(e)}")

@function.defn()
async def user_workspaces_update(input: UserWorkspaceUpdateInput) -> UserWorkspaceSingleOutput:
    """Update user role in workspace"""
    async for db in get_async_db():
        try:
            user_workspace_query = select(UserWorkspace).options(
                selectinload(UserWorkspace.user),
                selectinload(UserWorkspace.workspace)
            ).where(
                UserWorkspace.user_id == uuid.UUID(input.user_id),
                UserWorkspace.workspace_id == uuid.UUID(input.workspace_id)
            )
            result = await db.execute(user_workspace_query)
            user_workspace = result.scalar_one_or_none()
            
            if not user_workspace:
                raise NonRetryableError(message="User is not a member of this workspace")
            
            user_workspace.role = input.role
            await db.commit()
            await db.refresh(user_workspace)
            
            output_result = UserWorkspaceOutput(
                id=str(user_workspace.id),
                user_id=str(user_workspace.user_id),
                workspace_id=str(user_workspace.workspace_id),
                role=user_workspace.role,
                created_at=user_workspace.created_at.isoformat() if user_workspace.created_at else None,
                user_name=user_workspace.user.name if user_workspace.user else "N/A",
                user_email=user_workspace.user.email if user_workspace.user else "N/A",
                workspace_name=user_workspace.workspace.name if user_workspace.workspace else "N/A",
            )
            
            return UserWorkspaceSingleOutput(user_workspace=output_result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to update user workspace: {str(e)}")

@function.defn()
async def user_workspaces_delete(input: UserWorkspaceDeleteInput) -> UserWorkspaceDeleteOutput:
    """Remove a user from a workspace"""
    async for db in get_async_db():
        try:
            user_workspace_query = select(UserWorkspace).where(
                UserWorkspace.user_id == uuid.UUID(input.user_id),
                UserWorkspace.workspace_id == uuid.UUID(input.workspace_id)
            )
            result = await db.execute(user_workspace_query)
            user_workspace = result.scalar_one_or_none()
            
            if not user_workspace:
                raise NonRetryableError(message="User is not a member of this workspace")
            
            await db.delete(user_workspace)
            await db.commit()
            
            return UserWorkspaceDeleteOutput(success=True)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to remove user from workspace: {str(e)}") 