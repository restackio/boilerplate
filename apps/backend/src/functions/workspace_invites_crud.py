import os
import secrets
import uuid
from datetime import UTC, datetime

import resend
from pydantic import BaseModel, Field, field_validator
from restack_ai.function import NonRetryableError, function
from sqlalchemy import select

from src.database.connection import get_async_db
from src.database.models import (
    User,
    UserWorkspace,
    Workspace,
    WorkspaceInvite,
)
from src.utils.auth_context import (
    require_workspace_owner,
    resolve_redeemer,
)


class InvalidInviteEmailError(ValueError):
    def __init__(self) -> None:
        super().__init__("Email must contain @ symbol")


def _now_naive() -> datetime:
    return datetime.now(tz=UTC).replace(tzinfo=None)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _send_invite_email(
    to_email: str,
    inviter_name: str,
    workspace_name: str,
    invite_link: str,
) -> None:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        return

    resend.api_key = api_key
    from_email = os.getenv(
        "RESEND_FROM_EMAIL",
        "Workspace Invitations <onboarding@resend.dev>",
    )
    resend.Emails.send(
        {
            "from": from_email,
            "to": [to_email],
            "subject": f"{inviter_name} invited you to {workspace_name}",
            "html": f"""
                <p>{inviter_name} invited you to join the workspace <strong>{workspace_name}</strong>.</p>
                <p><a href="{invite_link}">Open invitation</a></p>
                <p>If the button does not work, use this link:</p>
                <p>{invite_link}</p>
                <p>If you were not expecting this invitation, you can ignore this email.</p>
            """,
        }
    )


class WorkspaceInviteCreateInput(BaseModel):
    actor_user_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)
    invited_email: str = Field(..., min_length=1, max_length=255)
    origin: str = Field(..., min_length=1)

    @field_validator("invited_email")
    @classmethod
    def validate_invited_email(cls, v: str) -> str:
        if "@" not in v:
            raise InvalidInviteEmailError
        return _normalize_email(v)


class WorkspaceInviteByTokenInput(BaseModel):
    token: str = Field(..., min_length=1, max_length=128)
    redeemer_user_id: str = Field(..., min_length=1)


class WorkspaceInviteByIdInput(BaseModel):
    invite_id: str = Field(..., min_length=1)
    actor_user_id: str = Field(..., min_length=1)
    origin: str | None = None


class WorkspaceInviteListPendingInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    actor_user_id: str = Field(..., min_length=1)


class WorkspaceInviteOutput(BaseModel):
    id: str
    workspace_id: str
    invited_email: str
    invited_by_user_id: str | None
    role: str
    token: str
    status: str
    created_at: str | None


class WorkspaceInviteActionOutput(BaseModel):
    success: bool
    status: str
    invite: WorkspaceInviteOutput | None = None
    workspace_id: str | None = None
    workspace_name: str | None = None
    error: str | None = None


class WorkspaceInviteListOutput(BaseModel):
    success: bool
    invites: list[WorkspaceInviteOutput]
    error: str | None = None


def _serialize_invite(invite: WorkspaceInvite) -> WorkspaceInviteOutput:
    return WorkspaceInviteOutput(
        id=str(invite.id),
        workspace_id=str(invite.workspace_id),
        invited_email=invite.invited_email,
        invited_by_user_id=str(invite.invited_by_user_id)
        if invite.invited_by_user_id
        else None,
        role=invite.role,
        token=invite.token,
        status=invite.status,
        created_at=invite.created_at.isoformat()
        if invite.created_at
        else None,
    )


@function.defn()
async def workspace_invites_create(
    function_input: WorkspaceInviteCreateInput,
) -> WorkspaceInviteActionOutput:
    async for db in get_async_db():
        try:
            await require_workspace_owner(
                db,
                actor_user_id=function_input.actor_user_id,
                workspace_id=function_input.workspace_id,
            )

            workspace_query = select(Workspace).where(
                Workspace.id == uuid.UUID(function_input.workspace_id)
            )
            workspace_result = await db.execute(workspace_query)
            workspace = workspace_result.scalar_one_or_none()
            if not workspace:
                raise NonRetryableError(message="Workspace not found")

            invited_email = _normalize_email(function_input.invited_email)
            user_query = select(User).where(User.email == invited_email)
            user_result = await db.execute(user_query)
            invited_user = user_result.scalar_one_or_none()

            if invited_user:
                existing_member_query = select(UserWorkspace).where(
                    UserWorkspace.workspace_id
                    == uuid.UUID(function_input.workspace_id),
                    UserWorkspace.user_id == invited_user.id,
                )
                existing_member_result = await db.execute(
                    existing_member_query
                )
                existing_member = (
                    existing_member_result.scalar_one_or_none()
                )
                if existing_member:
                    return WorkspaceInviteActionOutput(
                        success=False,
                        status="already_member",
                    )

            pending_query = select(WorkspaceInvite).where(
                WorkspaceInvite.workspace_id
                == uuid.UUID(function_input.workspace_id),
                WorkspaceInvite.invited_email == invited_email,
                WorkspaceInvite.status == "pending",
            )
            pending_result = await db.execute(pending_query)
            pending_invite = pending_result.scalar_one_or_none()
            if pending_invite:
                pending_invite.status = "revoked"
                pending_invite.revoked_at = _now_naive()

            invite = WorkspaceInvite(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(function_input.workspace_id),
                invited_email=invited_email,
                invited_by_user_id=uuid.UUID(
                    function_input.actor_user_id
                ),
                role="member",
                token=secrets.token_urlsafe(32),
                status="pending",
            )
            db.add(invite)
            await db.commit()
            await db.refresh(invite)

            inviter = await resolve_redeemer(
                db, function_input.actor_user_id
            )
            invite_link = (
                f"{function_input.origin.rstrip('/')}/invite?token={invite.token}"
            )
            _send_invite_email(
                to_email=invite.invited_email,
                inviter_name=inviter.name,
                workspace_name=workspace.name,
                invite_link=invite_link,
            )

            return WorkspaceInviteActionOutput(
                success=True,
                status="ok",
                invite=_serialize_invite(invite),
                workspace_id=str(workspace.id),
                workspace_name=workspace.name,
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to create workspace invite: {e!s}"
            ) from e
    return None


@function.defn()
async def workspace_invites_get_by_token(
    function_input: WorkspaceInviteByTokenInput,
) -> WorkspaceInviteActionOutput:
    async for db in get_async_db():
        try:
            invite_query = select(WorkspaceInvite).where(
                WorkspaceInvite.token == function_input.token
            )
            invite_result = await db.execute(invite_query)
            invite = invite_result.scalar_one_or_none()

            if not invite or invite.status != "pending":
                return WorkspaceInviteActionOutput(
                    success=False, status="not_pending"
                )

            redeemer = await resolve_redeemer(
                db, function_input.redeemer_user_id
            )
            if _normalize_email(redeemer.email) != _normalize_email(
                invite.invited_email
            ):
                return WorkspaceInviteActionOutput(
                    success=False, status="mismatch"
                )

            existing_member_query = select(UserWorkspace).where(
                UserWorkspace.workspace_id == invite.workspace_id,
                UserWorkspace.user_id == redeemer.id,
            )
            existing_member_result = await db.execute(
                existing_member_query
            )
            existing_member = existing_member_result.scalar_one_or_none()
            if existing_member:
                return WorkspaceInviteActionOutput(
                    success=True,
                    status="already_member",
                    workspace_id=str(invite.workspace_id),
                )

            workspace_query = select(Workspace).where(
                Workspace.id == invite.workspace_id
            )
            workspace_result = await db.execute(workspace_query)
            workspace = workspace_result.scalar_one_or_none()

            return WorkspaceInviteActionOutput(
                success=True,
                status="ok",
                invite=_serialize_invite(invite),
                workspace_id=str(invite.workspace_id),
                workspace_name=workspace.name if workspace else None,
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to read workspace invite: {e!s}"
            ) from e
    return None


@function.defn()
async def workspace_invites_accept(
    function_input: WorkspaceInviteByTokenInput,
) -> WorkspaceInviteActionOutput:
    async for db in get_async_db():
        try:
            invite_query = select(WorkspaceInvite).where(
                WorkspaceInvite.token == function_input.token,
                WorkspaceInvite.status == "pending",
            )
            invite_result = await db.execute(invite_query)
            invite = invite_result.scalar_one_or_none()
            if not invite:
                return WorkspaceInviteActionOutput(
                    success=False, status="not_pending"
                )

            redeemer = await resolve_redeemer(
                db, function_input.redeemer_user_id
            )
            if _normalize_email(redeemer.email) != _normalize_email(
                invite.invited_email
            ):
                return WorkspaceInviteActionOutput(
                    success=False, status="mismatch"
                )

            invite.status = "accepted"
            invite.accepted_at = _now_naive()
            invite.accepted_by_user_id = redeemer.id

            membership_query = select(UserWorkspace).where(
                UserWorkspace.workspace_id == invite.workspace_id,
                UserWorkspace.user_id == redeemer.id,
            )
            membership_result = await db.execute(membership_query)
            membership = membership_result.scalar_one_or_none()
            if not membership:
                membership = UserWorkspace(
                    id=uuid.uuid4(),
                    user_id=redeemer.id,
                    workspace_id=invite.workspace_id,
                    role="member",
                )
                db.add(membership)

            await db.commit()

            return WorkspaceInviteActionOutput(
                success=True,
                status="accepted",
                workspace_id=str(invite.workspace_id),
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to accept workspace invite: {e!s}"
            ) from e
    return None


@function.defn()
async def workspace_invites_decline(
    function_input: WorkspaceInviteByTokenInput,
) -> WorkspaceInviteActionOutput:
    async for db in get_async_db():
        try:
            invite_query = select(WorkspaceInvite).where(
                WorkspaceInvite.token == function_input.token,
                WorkspaceInvite.status == "pending",
            )
            invite_result = await db.execute(invite_query)
            invite = invite_result.scalar_one_or_none()
            if not invite:
                return WorkspaceInviteActionOutput(
                    success=False, status="not_pending"
                )

            redeemer = await resolve_redeemer(
                db, function_input.redeemer_user_id
            )
            if _normalize_email(redeemer.email) != _normalize_email(
                invite.invited_email
            ):
                return WorkspaceInviteActionOutput(
                    success=False, status="mismatch"
                )

            invite.status = "declined"
            invite.declined_at = _now_naive()
            await db.commit()

            return WorkspaceInviteActionOutput(
                success=True,
                status="declined",
                workspace_id=str(invite.workspace_id),
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to decline workspace invite: {e!s}"
            ) from e
    return None


@function.defn()
async def workspace_invites_list_pending(
    function_input: WorkspaceInviteListPendingInput,
) -> WorkspaceInviteListOutput:
    async for db in get_async_db():
        try:
            await require_workspace_owner(
                db,
                actor_user_id=function_input.actor_user_id,
                workspace_id=function_input.workspace_id,
            )
            invites_query = select(WorkspaceInvite).where(
                WorkspaceInvite.workspace_id
                == uuid.UUID(function_input.workspace_id),
                WorkspaceInvite.status == "pending",
            )
            invites_result = await db.execute(invites_query)
            invites = invites_result.scalars().all()
            return WorkspaceInviteListOutput(
                success=True,
                invites=[_serialize_invite(invite) for invite in invites],
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to list pending invites: {e!s}"
            ) from e
    return None


@function.defn()
async def workspace_invites_revoke(
    function_input: WorkspaceInviteByIdInput,
) -> WorkspaceInviteActionOutput:
    async for db in get_async_db():
        try:
            invite_query = select(WorkspaceInvite).where(
                WorkspaceInvite.id == uuid.UUID(function_input.invite_id)
            )
            invite_result = await db.execute(invite_query)
            invite = invite_result.scalar_one_or_none()
            if not invite:
                return WorkspaceInviteActionOutput(
                    success=False, status="not_found"
                )

            await require_workspace_owner(
                db,
                actor_user_id=function_input.actor_user_id,
                workspace_id=str(invite.workspace_id),
            )

            if invite.status != "pending":
                return WorkspaceInviteActionOutput(
                    success=False, status="not_pending"
                )

            invite.status = "revoked"
            invite.revoked_at = _now_naive()
            await db.commit()
            return WorkspaceInviteActionOutput(
                success=True,
                status="revoked",
                workspace_id=str(invite.workspace_id),
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to revoke invite: {e!s}"
            ) from e
    return None


@function.defn()
async def workspace_invites_resend(
    function_input: WorkspaceInviteByIdInput,
) -> WorkspaceInviteActionOutput:
    async for db in get_async_db():
        try:
            if not function_input.origin:
                raise NonRetryableError(
                    message="origin is required to resend invites"
                )

            invite_query = select(WorkspaceInvite).where(
                WorkspaceInvite.id == uuid.UUID(function_input.invite_id)
            )
            invite_result = await db.execute(invite_query)
            invite = invite_result.scalar_one_or_none()
            if not invite:
                return WorkspaceInviteActionOutput(
                    success=False, status="not_found"
                )

            await require_workspace_owner(
                db,
                actor_user_id=function_input.actor_user_id,
                workspace_id=str(invite.workspace_id),
            )
            if invite.status != "pending":
                return WorkspaceInviteActionOutput(
                    success=False, status="not_pending"
                )

            workspace_query = select(Workspace).where(
                Workspace.id == invite.workspace_id
            )
            workspace_result = await db.execute(workspace_query)
            workspace = workspace_result.scalar_one_or_none()
            if not workspace:
                raise NonRetryableError(message="Workspace not found")

            invite.status = "revoked"
            invite.revoked_at = _now_naive()

            new_invite = WorkspaceInvite(
                id=uuid.uuid4(),
                workspace_id=invite.workspace_id,
                invited_email=invite.invited_email,
                invited_by_user_id=uuid.UUID(
                    function_input.actor_user_id
                ),
                role="member",
                token=secrets.token_urlsafe(32),
                status="pending",
            )
            db.add(new_invite)
            await db.commit()
            await db.refresh(new_invite)

            inviter = await resolve_redeemer(
                db, function_input.actor_user_id
            )
            invite_link = (
                f"{function_input.origin.rstrip('/')}/invite?token={new_invite.token}"
            )
            _send_invite_email(
                to_email=new_invite.invited_email,
                inviter_name=inviter.name,
                workspace_name=workspace.name,
                invite_link=invite_link,
            )

            return WorkspaceInviteActionOutput(
                success=True,
                status="ok",
                invite=_serialize_invite(new_invite),
                workspace_id=str(new_invite.workspace_id),
                workspace_name=workspace.name,
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to resend invite: {e!s}"
            ) from e
    return None
