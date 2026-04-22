"""CRUD functions for Slack installations and channel-agent mappings."""

import uuid

from pydantic import BaseModel, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import and_, select

from src.database.connection import get_async_db
from src.database.models import (
    SlackChannelAgent,
    SlackInstallation,
)

# ── Input models ────────────────────────────────────────────────────

class SlackInstallationCreateInput(BaseModel):
    team_id: str = Field(..., min_length=1)
    team_name: str = ""
    bot_token: str = Field(..., min_length=1)
    bot_user_id: str = ""
    workspace_id: str = Field(..., min_length=1)
    installed_by: str | None = None


class SlackInstallationByTeamInput(BaseModel):
    team_id: str = Field(..., min_length=1)


class SlackInstallationByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)


class SlackChannelAgentCreateInput(BaseModel):
    slack_installation_id: str = Field(..., min_length=1)
    channel_id: str = Field(..., min_length=1)
    channel_name: str = ""
    agent_id: str = Field(..., min_length=1)
    is_default: bool = False


class SlackChannelAgentDeleteInput(BaseModel):
    id: str = Field(..., min_length=1)


class SlackChannelAgentLookupInput(BaseModel):
    team_id: str = Field(..., min_length=1)
    channel_id: str = Field(..., min_length=1)


class SlackChannelAgentsByInstallationInput(BaseModel):
    slack_installation_id: str = Field(..., min_length=1)


# ── Output models ───────────────────────────────────────────────────

class SlackInstallationOutput(BaseModel):
    id: str
    team_id: str
    team_name: str
    bot_token: str
    bot_user_id: str
    workspace_id: str
    installed_by: str | None
    installed_at: str | None
    updated_at: str | None

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class SlackInstallationSingleOutput(BaseModel):
    installation: SlackInstallationOutput | None


class SlackInstallationListOutput(BaseModel):
    installations: list[SlackInstallationOutput]


class SlackChannelAgentOutput(BaseModel):
    id: str
    slack_installation_id: str
    channel_id: str
    channel_name: str
    agent_id: str
    is_default: bool
    enabled: bool
    created_at: str | None
    updated_at: str | None

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class SlackChannelAgentSingleOutput(BaseModel):
    channel_agent: SlackChannelAgentOutput | None


class SlackChannelAgentListOutput(BaseModel):
    channel_agents: list[SlackChannelAgentOutput]


class SlackRoutingResult(BaseModel):
    found: bool
    agent_id: str | None = None
    workspace_id: str | None = None
    bot_token: str | None = None
    installation_id: str | None = None


class DeleteOutput(BaseModel):
    success: bool


# ── Helpers ─────────────────────────────────────────────────────────

def _serialize_installation(inst: SlackInstallation) -> SlackInstallationOutput:
    return SlackInstallationOutput(
        id=str(inst.id),
        team_id=inst.team_id,
        team_name=inst.team_name,
        bot_token=inst.bot_token,
        bot_user_id=inst.bot_user_id,
        workspace_id=str(inst.workspace_id),
        installed_by=inst.installed_by,
        installed_at=inst.installed_at.isoformat() if inst.installed_at else None,
        updated_at=inst.updated_at.isoformat() if inst.updated_at else None,
    )


def _serialize_channel_agent(ca: SlackChannelAgent) -> SlackChannelAgentOutput:
    return SlackChannelAgentOutput(
        id=str(ca.id),
        slack_installation_id=str(ca.slack_installation_id),
        channel_id=ca.channel_id,
        channel_name=ca.channel_name,
        agent_id=str(ca.agent_id),
        is_default=ca.is_default,
        enabled=ca.enabled,
        created_at=ca.created_at.isoformat() if ca.created_at else None,
        updated_at=ca.updated_at.isoformat() if ca.updated_at else None,
    )


# ── Installation CRUD ───────────────────────────────────────────────

@function.defn()
async def slack_installation_upsert(
    function_input: SlackInstallationCreateInput,
) -> SlackInstallationSingleOutput:
    """Create or update a Slack installation (upsert by team_id)."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(SlackInstallation).where(
                    SlackInstallation.team_id == function_input.team_id
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.team_name = function_input.team_name
                existing.bot_token = function_input.bot_token
                existing.bot_user_id = function_input.bot_user_id
                existing.workspace_id = uuid.UUID(function_input.workspace_id)
                if function_input.installed_by:
                    existing.installed_by = function_input.installed_by
                await db.commit()
                await db.refresh(existing)
                return SlackInstallationSingleOutput(
                    installation=_serialize_installation(existing)
                )

            inst = SlackInstallation(
                id=uuid.uuid4(),
                team_id=function_input.team_id,
                team_name=function_input.team_name,
                bot_token=function_input.bot_token,
                bot_user_id=function_input.bot_user_id,
                workspace_id=uuid.UUID(function_input.workspace_id),
                installed_by=function_input.installed_by,
            )
            db.add(inst)
            await db.commit()
            await db.refresh(inst)
            return SlackInstallationSingleOutput(
                installation=_serialize_installation(inst)
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to upsert Slack installation: {e!s}"
            ) from e
    return None


@function.defn()
async def slack_installation_get_by_team(
    function_input: SlackInstallationByTeamInput,
) -> SlackInstallationSingleOutput:
    """Get a Slack installation by team_id."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(SlackInstallation).where(
                    SlackInstallation.team_id == function_input.team_id
                )
            )
            inst = result.scalar_one_or_none()
            if not inst:
                return SlackInstallationSingleOutput(installation=None)
            return SlackInstallationSingleOutput(
                installation=_serialize_installation(inst)
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get Slack installation: {e!s}"
            ) from e
    return None


@function.defn()
async def slack_installations_by_workspace(
    function_input: SlackInstallationByWorkspaceInput,
) -> SlackInstallationListOutput:
    """List all Slack installations for a workspace."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(SlackInstallation)
                .where(
                    SlackInstallation.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
                .order_by(SlackInstallation.installed_at.desc())
            )
            installations = result.scalars().all()
            return SlackInstallationListOutput(
                installations=[_serialize_installation(i) for i in installations]
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to list Slack installations: {e!s}"
            ) from e
    return None


@function.defn()
async def slack_installation_delete(
    function_input: SlackInstallationByTeamInput,
) -> DeleteOutput:
    """Delete a Slack installation by team_id (cascades to channel_agents)."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(SlackInstallation).where(
                    SlackInstallation.team_id == function_input.team_id
                )
            )
            inst = result.scalar_one_or_none()
            if not inst:
                raise NonRetryableError(
                    message=f"Installation for team {function_input.team_id} not found"
                )
            await db.delete(inst)
            await db.commit()
            return DeleteOutput(success=True)
        except NonRetryableError:
            raise
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete Slack installation: {e!s}"
            ) from e
    return None


# ── Channel-Agent mapping CRUD ──────────────────────────────────────

@function.defn()
async def slack_channel_agent_create(
    function_input: SlackChannelAgentCreateInput,
) -> SlackChannelAgentSingleOutput:
    """Assign an agent to a Slack channel."""
    async for db in get_async_db():
        try:
            if function_input.is_default:
                existing_default = await db.execute(
                    select(SlackChannelAgent).where(
                        and_(
                            SlackChannelAgent.slack_installation_id
                            == uuid.UUID(function_input.slack_installation_id),
                            SlackChannelAgent.is_default.is_(True),
                        )
                    )
                )
                old_default = existing_default.scalar_one_or_none()
                if old_default:
                    old_default.is_default = False

            ca = SlackChannelAgent(
                id=uuid.uuid4(),
                slack_installation_id=uuid.UUID(function_input.slack_installation_id),
                channel_id=function_input.channel_id,
                channel_name=function_input.channel_name,
                agent_id=uuid.UUID(function_input.agent_id),
                is_default=function_input.is_default,
            )
            db.add(ca)
            await db.commit()
            await db.refresh(ca)
            return SlackChannelAgentSingleOutput(
                channel_agent=_serialize_channel_agent(ca)
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to create channel-agent mapping: {e!s}"
            ) from e
    return None


@function.defn()
async def slack_channel_agent_delete(
    function_input: SlackChannelAgentDeleteInput,
) -> DeleteOutput:
    """Remove a channel-agent mapping."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(SlackChannelAgent).where(
                    SlackChannelAgent.id == uuid.UUID(function_input.id)
                )
            )
            ca = result.scalar_one_or_none()
            if not ca:
                raise NonRetryableError(message="Channel-agent mapping not found")
            await db.delete(ca)
            await db.commit()
            return DeleteOutput(success=True)
        except NonRetryableError:
            raise
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete channel-agent mapping: {e!s}"
            ) from e
    return None


@function.defn()
async def slack_channel_agents_by_installation(
    function_input: SlackChannelAgentsByInstallationInput,
) -> SlackChannelAgentListOutput:
    """List all channel-agent mappings for an installation."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(SlackChannelAgent)
                .where(
                    SlackChannelAgent.slack_installation_id
                    == uuid.UUID(function_input.slack_installation_id)
                )
                .order_by(SlackChannelAgent.channel_name.asc())
            )
            mappings = result.scalars().all()
            return SlackChannelAgentListOutput(
                channel_agents=[_serialize_channel_agent(m) for m in mappings]
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to list channel-agent mappings: {e!s}"
            ) from e
    return None


@function.defn()
async def slack_route_event(
    function_input: SlackChannelAgentLookupInput,
) -> SlackRoutingResult:
    """Core routing lookup: given team_id + channel_id, find the agent and bot token.

    Falls back to the default (DM) agent if no channel-specific mapping exists.
    """
    async for db in get_async_db():
        try:
            inst_result = await db.execute(
                select(SlackInstallation).where(
                    SlackInstallation.team_id == function_input.team_id
                )
            )
            inst = inst_result.scalar_one_or_none()
            if not inst:
                return SlackRoutingResult(found=False)

            ca_result = await db.execute(
                select(SlackChannelAgent).where(
                    and_(
                        SlackChannelAgent.slack_installation_id == inst.id,
                        SlackChannelAgent.channel_id == function_input.channel_id,
                        SlackChannelAgent.enabled.is_(True),
                    )
                )
            )
            ca = ca_result.scalar_one_or_none()

            if not ca:
                default_result = await db.execute(
                    select(SlackChannelAgent).where(
                        and_(
                            SlackChannelAgent.slack_installation_id == inst.id,
                            SlackChannelAgent.is_default.is_(True),
                            SlackChannelAgent.enabled.is_(True),
                        )
                    )
                )
                ca = default_result.scalar_one_or_none()

            if not ca:
                return SlackRoutingResult(
                    found=False,
                    workspace_id=str(inst.workspace_id),
                    bot_token=inst.bot_token,
                    installation_id=str(inst.id),
                )

            return SlackRoutingResult(
                found=True,
                agent_id=str(ca.agent_id),
                workspace_id=str(inst.workspace_id),
                bot_token=inst.bot_token,
                installation_id=str(inst.id),
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to route Slack event: {e!s}"
            ) from e
    return None
