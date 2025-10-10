import uuid
from typing import Any

from pydantic import BaseModel, Field, field_validator
from restack_ai.function import function
from sqlalchemy import select

from src.database.connection import get_async_db
from src.database.models import User, UserWorkspace, Workspace
from src.utils.password import hash_password, verify_password


# Pydantic models for input validation
class UserSignupInput(BaseModel):
    workspace_id: str
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=6, max_length=100)
    avatar_url: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Simple email validation - just check for @ symbol
        if "@" not in v:
            msg = "Email must contain @ symbol"
            raise ValueError(msg)
        return v.lower()


class UserLoginInput(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Simple email validation - just check for @ symbol
        if "@" not in v:
            msg = "Email must contain @ symbol"
            raise ValueError(msg)
        return v.lower()


class AuthOutput(BaseModel):
    success: bool
    user: dict[str, Any] | None = None
    error: str | None = None


@function.defn()
async def user_signup(user_data: UserSignupInput) -> AuthOutput:
    """Sign up a new user."""
    async for db in get_async_db():
        try:
            # Verify workspace exists
            workspace_query = select(Workspace).where(
                Workspace.id == uuid.UUID(user_data.workspace_id)
            )
            workspace_result = await db.execute(workspace_query)
            workspace = workspace_result.scalar_one_or_none()

            if not workspace:
                return AuthOutput(
                    success=False, error="Workspace not found"
                )

            # Check if user already exists
            existing_user_query = select(User).where(
                User.email == user_data.email
            )
            existing_user_result = await db.execute(
                existing_user_query
            )
            existing_user = (
                existing_user_result.scalar_one_or_none()
            )

            if existing_user:
                return AuthOutput(
                    success=False,
                    error="User with this email already exists",
                )

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
            await db.flush()  # Flush to get the user ID

            # Create user-workspace relationship
            user_workspace = UserWorkspace(
                user_id=user.id,
                workspace_id=uuid.UUID(user_data.workspace_id),
                role="owner",  # First user in workspace is owner
            )

            db.add(user_workspace)
            await db.commit()
            await db.refresh(user)

            # Get user's workspaces for response
            user_workspaces_query = select(UserWorkspace).where(
                UserWorkspace.user_id == user.id
            )
            user_workspaces_result = await db.execute(
                user_workspaces_query
            )
            user_workspaces = (
                user_workspaces_result.scalars().all()
            )
            workspace_ids = [
                str(uw.workspace_id) for uw in user_workspaces
            ]

            # Return user data without password
            user_data_response = {
                "id": str(user.id),
                "workspace_ids": workspace_ids,
                "name": user.name,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "created_at": user.created_at.isoformat()
                if user.created_at
                else None,
                "updated_at": user.updated_at.isoformat()
                if user.updated_at
                else None,
            }

            return AuthOutput(
                success=True, user=user_data_response
            )
        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
            ConnectionError,
            OSError,
        ) as e:
            await db.rollback()
            return AuthOutput(success=False, error=str(e))
    return None


@function.defn()
async def user_login(login_data: UserLoginInput) -> AuthOutput:
    """Log in a user."""
    async for db in get_async_db():
        try:
            # Find user by email
            user_query = select(User).where(
                User.email == login_data.email
            )
            result = await db.execute(user_query)
            user = result.scalar_one_or_none()

            if not user:
                return AuthOutput(
                    success=False,
                    error="Invalid email or password",
                )

            # Verify password
            if not verify_password(
                login_data.password, user.password_hash
            ):
                return AuthOutput(
                    success=False,
                    error="Invalid email or password",
                )

            # Get user's workspaces
            user_workspaces_query = select(UserWorkspace).where(
                UserWorkspace.user_id == user.id
            )
            user_workspaces_result = await db.execute(
                user_workspaces_query
            )
            user_workspaces = (
                user_workspaces_result.scalars().all()
            )
            workspace_ids = [
                str(uw.workspace_id) for uw in user_workspaces
            ]

            # Return user data without password
            user_data_response = {
                "id": str(user.id),
                "workspace_ids": workspace_ids,
                "name": user.name,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "created_at": user.created_at.isoformat()
                if user.created_at
                else None,
                "updated_at": user.updated_at.isoformat()
                if user.updated_at
                else None,
            }

            return AuthOutput(
                success=True, user=user_data_response
            )
        except (
            ValueError,
            TypeError,
            RuntimeError,
            AttributeError,
            ConnectionError,
            OSError,
        ) as e:
            return AuthOutput(success=False, error=str(e))
    return None
