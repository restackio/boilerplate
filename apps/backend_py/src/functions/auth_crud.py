import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
import re

from src.database.connection import get_db
from src.database.models import User, Workspace, UserWorkspace
from src.utils.password import hash_password, verify_password
from restack_ai.function import function

# Pydantic models for input validation
class UserSignupInput(BaseModel):
    workspace_id: str
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=6, max_length=100)
    avatar_url: Optional[str] = None

    @validator('email')
    def validate_email(cls, v):
        # Simple email validation - just check for @ symbol
        if '@' not in v:
            raise ValueError('Email must contain @ symbol')
        return v.lower()

class UserLoginInput(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    password: str

    @validator('email')
    def validate_email(cls, v):
        # Simple email validation - just check for @ symbol
        if '@' not in v:
            raise ValueError('Email must contain @ symbol')
        return v.lower()

class AuthOutput(BaseModel):
    success: bool
    user: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@function.defn()
async def user_signup(user_data: UserSignupInput) -> AuthOutput:
    """Sign up a new user"""
    db = next(get_db())
    try:
        # Verify workspace exists
        workspace = db.query(Workspace).filter(Workspace.id == user_data.workspace_id).first()
        if not workspace:
            return AuthOutput(success=False, error="Workspace not found")
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            return AuthOutput(success=False, error="User with this email already exists")
        
        # Hash the password
        password_hash = hash_password(user_data.password)
        
        # Create new user
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            name=user_data.name,
            email=user_data.email,
            password_hash=password_hash,
            avatar_url=user_data.avatar_url,
        )
        
        db.add(user)
        db.flush()  # Flush to get the user ID
        
        # Create user-workspace relationship
        user_workspace = UserWorkspace(
            user_id=user.id,
            workspace_id=user_data.workspace_id,
            role="owner"  # First user in workspace is owner
        )
        
        db.add(user_workspace)
        db.commit()
        db.refresh(user)
        
        # Get user's workspaces for response
        user_workspaces = db.query(UserWorkspace).filter(UserWorkspace.user_id == user.id).all()
        workspace_ids = [str(uw.workspace_id) for uw in user_workspaces]
        
        # Return user data without password
        user_data_response = {
            "id": str(user.id),
            "workspace_ids": workspace_ids,
            "name": user.name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        }
        
        return AuthOutput(success=True, user=user_data_response)
    except Exception as e:
        db.rollback()
        return AuthOutput(success=False, error=str(e))
    finally:
        db.close()

@function.defn()
async def user_login(login_data: UserLoginInput) -> AuthOutput:
    """Log in a user"""
    db = next(get_db())
    try:
        # Find user by email
        user = db.query(User).filter(User.email == login_data.email).first()
        if not user:
            return AuthOutput(success=False, error="Invalid email or password")
        
        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            return AuthOutput(success=False, error="Invalid email or password")
        
        # Get user's workspaces
        user_workspaces = db.query(UserWorkspace).filter(UserWorkspace.user_id == user.id).all()
        workspace_ids = [str(uw.workspace_id) for uw in user_workspaces]
        
        # Return user data without password
        user_data_response = {
            "id": str(user.id),
            "workspace_ids": workspace_ids,
            "name": user.name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        }
        
        return AuthOutput(success=True, user=user_data_response)
    except Exception as e:
        return AuthOutput(success=False, error=str(e))
    finally:
        db.close()