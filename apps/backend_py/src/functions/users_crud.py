import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select
from pydantic import BaseModel, Field, EmailStr

from ..database.connection import get_async_db
from ..database.models import User, Workspace
from restack_ai.function import function, NonRetryableError

# Pydantic models for input validation
class UserCreateInput(BaseModel):
    workspace_id: str
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    avatar_url: Optional[str] = None

class UserUpdateInput(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None

class UserOutput(BaseModel):
    id: str
    workspace_id: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UserSingleOutput(BaseModel):
    user: UserOutput

class UserListOutput(BaseModel):
    users: List[UserOutput]

@function.defn()
async def users_read() -> UserListOutput:
    """Read all users"""
    async for db in get_async_db():
        try:
            users_query = select(User)
            result = await db.execute(users_query)
            users = result.scalars().all()
            
            output_result = [
                UserOutput(
                    id=str(user.id),
                    workspace_id=str(user.workspace_id),
                    name=user.name,
                    email=user.email,
                    avatar_url=user.avatar_url,
                    created_at=user.created_at.isoformat() if user.created_at else None,
                    updated_at=user.updated_at.isoformat() if user.updated_at else None,
                )
                for user in users
            ]
            return UserListOutput(users=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Database error: {str(e)}")

@function.defn()
async def users_create(user_data: UserCreateInput) -> UserSingleOutput:
    """Create a new user"""
    async for db in get_async_db():
        try:
            # Verify workspace exists
            workspace_query = select(Workspace).where(Workspace.id == uuid.UUID(user_data.workspace_id))
            workspace_result = await db.execute(workspace_query)
            workspace = workspace_result.scalar_one_or_none()
            
            if not workspace:
                raise NonRetryableError(message=f"Workspace with id {user_data.workspace_id} not found")
            
            user_id = uuid.uuid4()
            user = User(
                id=user_id,
                workspace_id=uuid.UUID(user_data.workspace_id),
                name=user_data.name,
                email=user_data.email,
                avatar_url=user_data.avatar_url,
            )
            
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
            result = UserOutput(
                id=str(user.id),
                workspace_id=str(user.workspace_id),
                name=user.name,
                email=user.email,
                avatar_url=user.avatar_url,
                created_at=user.created_at.isoformat() if user.created_at else None,
                updated_at=user.updated_at.isoformat() if user.updated_at else None,
            )
            
            return UserSingleOutput(user=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to create user: {str(e)}")

@function.defn()
async def users_update(user_id: str, updates: UserUpdateInput) -> UserSingleOutput:
    """Update an existing user"""
    async for db in get_async_db():
        try:
            user_query = select(User).where(User.id == uuid.UUID(user_id))
            result = await db.execute(user_query)
            user = result.scalar_one_or_none()
            
            if not user:
                raise NonRetryableError(message=f"User with id {user_id} not found")
            
            # Update fields (only non-None values)
            update_data = updates.dict(exclude_unset=True)
            for key, value in update_data.items():
                if hasattr(user, key):
                    setattr(user, key, value)
            
            user.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(user)
            
            result = UserOutput(
                id=str(user.id),
                workspace_id=str(user.workspace_id),
                name=user.name,
                email=user.email,
                avatar_url=user.avatar_url,
                created_at=user.created_at.isoformat() if user.created_at else None,
                updated_at=user.updated_at.isoformat() if user.updated_at else None,
            )
            
            return UserSingleOutput(user=result)
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to update user: {str(e)}")

@function.defn()
async def users_delete(user_id: str) -> Dict[str, bool]:
    """Delete a user"""
    async for db in get_async_db():
        try:
            user_query = select(User).where(User.id == uuid.UUID(user_id))
            result = await db.execute(user_query)
            user = result.scalar_one_or_none()
            
            if not user:
                raise NonRetryableError(message=f"User with id {user_id} not found")
            
            await db.delete(user)
            await db.commit()
            
            return {"success": True}
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(message=f"Failed to delete user: {str(e)}")

@function.defn()
async def users_get_by_id(user_id: str) -> Optional[UserSingleOutput]:
    """Get a specific user by ID"""
    async for db in get_async_db():
        try:
            user_query = select(User).where(User.id == uuid.UUID(user_id))
            result = await db.execute(user_query)
            user = result.scalar_one_or_none()
            
            if not user:
                return None
            
            output_result = UserOutput(
                id=str(user.id),
                workspace_id=str(user.workspace_id),
                name=user.name,
                email=user.email,
                avatar_url=user.avatar_url,
                created_at=user.created_at.isoformat() if user.created_at else None,
                updated_at=user.updated_at.isoformat() if user.updated_at else None,
            )
            
            return UserSingleOutput(user=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Failed to get user: {str(e)}")

@function.defn()
async def users_get_by_email(email: str) -> Optional[UserSingleOutput]:
    """Get a specific user by email"""
    async for db in get_async_db():
        try:
            user_query = select(User).where(User.email == email)
            result = await db.execute(user_query)
            user = result.scalar_one_or_none()
            
            if not user:
                return None
            
            output_result = UserOutput(
                id=str(user.id),
                workspace_id=str(user.workspace_id),
                name=user.name,
                email=user.email,
                avatar_url=user.avatar_url,
                created_at=user.created_at.isoformat() if user.created_at else None,
                updated_at=user.updated_at.isoformat() if user.updated_at else None,
            )
            
            return UserSingleOutput(user=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Failed to get user by email: {str(e)}")

@function.defn()
async def users_get_by_workspace(workspace_id: str) -> UserListOutput:
    """Get all users in a workspace"""
    async for db in get_async_db():
        try:
            users_query = select(User).where(User.workspace_id == uuid.UUID(workspace_id))
            result = await db.execute(users_query)
            users = result.scalars().all()
            
            output_result = [
                UserOutput(
                    id=str(user.id),
                    workspace_id=str(user.workspace_id),
                    name=user.name,
                    email=user.email,
                    avatar_url=user.avatar_url,
                    created_at=user.created_at.isoformat() if user.created_at else None,
                    updated_at=user.updated_at.isoformat() if user.updated_at else None,
                )
                for user in users
            ]
            return UserListOutput(users=output_result)
        except Exception as e:
            raise NonRetryableError(message=f"Failed to get users by workspace: {str(e)}") 