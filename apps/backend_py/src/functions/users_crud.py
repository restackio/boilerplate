import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field, EmailStr

from src.database.connection import get_db
from src.database.models import User, Workspace
from restack_ai.function import function

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
    db = next(get_db())
    try:
        users = db.query(User).all()
        result = [
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
        return UserListOutput(users=result)
    finally:
        db.close()

@function.defn()
async def users_create(user_data: UserCreateInput) -> UserSingleOutput:
    """Create a new user"""
    db = next(get_db())
    try:
        # Verify workspace exists
        workspace = db.query(Workspace).filter(Workspace.id == user_data.workspace_id).first()
        if not workspace:
            raise ValueError(f"Workspace with id {user_data.workspace_id} not found")
        
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            workspace_id=user_data.workspace_id,
            name=user_data.name,
            email=user_data.email,
            avatar_url=user_data.avatar_url,
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
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
    finally:
        db.close()

@function.defn()
async def users_update(user_id: str, updates: UserUpdateInput) -> UserSingleOutput:
    """Update an existing user"""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User with id {user_id} not found")
        
        # Update fields (only non-None values)
        update_data = updates.dict(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
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
    finally:
        db.close()

@function.defn()
async def users_delete(user_id: str) -> Dict[str, bool]:
    """Delete a user"""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User with id {user_id} not found")
        
        db.delete(user)
        db.commit()
        
        return {"success": True}
    finally:
        db.close()

@function.defn()
async def users_get_by_id(user_id: str) -> Optional[UserSingleOutput]:
    """Get a specific user by ID"""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
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
    finally:
        db.close()

@function.defn()
async def users_get_by_email(email: str) -> Optional[UserSingleOutput]:
    """Get a specific user by email"""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        
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
    finally:
        db.close()

@function.defn()
async def users_get_by_workspace(workspace_id: str) -> UserListOutput:
    """Get all users in a workspace"""
    db = next(get_db())
    try:
        users = db.query(User).filter(User.workspace_id == workspace_id).all()
        result = [
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
        return UserListOutput(users=result)
    finally:
        db.close() 