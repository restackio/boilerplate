import uuid

from restack_ai.function import NonRetryableError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import User, UserWorkspace


async def resolve_redeemer(
    db: AsyncSession, user_id: str
) -> User:
    """Resolve the redeemer from client-supplied identity.

    This is intentionally a narrow helper so identity verification can be
    swapped to server-side sessions later in one place.
    """
    user_query = select(User).where(User.id == uuid.UUID(user_id))
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        raise NonRetryableError(message="User not found")

    return user


async def require_workspace_owner(
    db: AsyncSession, actor_user_id: str, workspace_id: str
) -> None:
    owner_query = select(UserWorkspace).where(
        UserWorkspace.user_id == uuid.UUID(actor_user_id),
        UserWorkspace.workspace_id == uuid.UUID(workspace_id),
        UserWorkspace.role == "owner",
    )
    owner_result = await db.execute(owner_query)
    owner_link = owner_result.scalar_one_or_none()

    if not owner_link:
        raise NonRetryableError(
            message="Only workspace owners can manage invites"
        )
