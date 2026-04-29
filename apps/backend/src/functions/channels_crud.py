"""CRUD activities for polymorphic channel integrations.

These work across any messaging provider (currently Slack; future: Telegram,
WhatsApp, iMessage). Provider-shaped data lives in ``credentials`` JSONB on
``channel_integrations`` and is opaque at this layer.

Routing model: explicit ``channels`` row → agent. No mapping → caller falls
through to a per-provider concierge LLM.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import select

from src.database.connection import get_async_db
from src.database.models import Agent, Channel, ChannelIntegration
from src.functions.slack_callback import _slack_api_call

logger = logging.getLogger(__name__)

# ── Input models ────────────────────────────────────────────────────


class ChannelIntegrationUpsertInput(BaseModel):
    """Upsert a per-workspace integration (one per ``channel_type`` + ``external_id``)."""

    workspace_id: str = Field(..., min_length=1)
    channel_type: str = Field(
        ..., min_length=1, description="e.g. 'slack'."
    )
    external_id: str = Field(
        ...,
        min_length=1,
        description=(
            "Provider-side workspace/team id (e.g. Slack team_id 'T01234ABC')."
        ),
    )
    credentials: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Provider-shaped credentials. Slack: {'bot_token': 'xoxb-...'}."
        ),
    )


class ChannelIntegrationByExternalIdInput(BaseModel):
    channel_type: str = Field(..., min_length=1)
    external_id: str = Field(..., min_length=1)


class ChannelIntegrationsByWorkspaceInput(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    channel_type: str | None = Field(
        default=None,
        description="If set, only return integrations of this provider.",
    )


class ChannelCreateInput(BaseModel):
    channel_integration_id: str = Field(..., min_length=1)
    external_channel_id: str = Field(..., min_length=1)
    agent_id: str = Field(..., min_length=1)
    notify_slack: bool = Field(
        default=True,
        description=(
            "If True and the integration is Slack, post a confirmation in the "
            "Slack channel. Set False when the user already saw confirmation in "
            "Slack (e.g. the in-app agent picker that updates the prompt message)."
        ),
    )


class ChannelDeleteInput(BaseModel):
    id: str = Field(..., min_length=1)


class ChannelsByIntegrationInput(BaseModel):
    channel_integration_id: str = Field(..., min_length=1)


class ChannelsByWorkspaceInput(BaseModel):
    """List channels across all integrations in a workspace."""

    workspace_id: str = Field(..., min_length=1)
    channel_type: str | None = Field(
        default=None,
        description="If set, only return channels for this provider.",
    )
    agent_ids: list[str] | None = Field(
        default=None,
        description=(
            "If set, only return channels bound to one of these agent ids. "
            "Useful for the agent-builder Channels view."
        ),
    )


class ChannelRouteEventInput(BaseModel):
    """Lookup input: given a provider event, find the agent + bot credentials."""

    channel_type: str = Field(..., min_length=1)
    external_id: str = Field(
        ...,
        min_length=1,
        description="Provider workspace id (e.g. Slack team_id).",
    )
    external_channel_id: str = Field(
        ...,
        min_length=1,
        description="Provider channel id (e.g. Slack channel_id).",
    )


# ── Output models ───────────────────────────────────────────────────


class ChannelIntegrationOutput(BaseModel):
    """Public shape of an integration. Credentials are intentionally omitted."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    channel_type: str
    external_id: str
    created_at: str | None


class ChannelIntegrationSingleOutput(BaseModel):
    integration: ChannelIntegrationOutput | None


class ChannelIntegrationListOutput(BaseModel):
    integrations: list[ChannelIntegrationOutput]


class ChannelOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    channel_integration_id: str
    external_channel_id: str
    agent_id: str
    created_at: str | None


class ChannelSingleOutput(BaseModel):
    channel: ChannelOutput | None


class ChannelListOutput(BaseModel):
    channels: list[ChannelOutput]


class ChannelWithIntegrationOutput(BaseModel):
    """A channel binding plus the parent integration's identifying fields.

    Returned by ``channels_by_workspace`` so the caller can group/filter by
    provider (channel_type) and external workspace (external_id) without an
    extra round-trip.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    channel_integration_id: str
    external_channel_id: str
    agent_id: str
    created_at: str | None
    channel_type: str
    external_id: str


class ChannelWithIntegrationListOutput(BaseModel):
    channels: list[ChannelWithIntegrationOutput]


class ChannelRouteResult(BaseModel):
    """Routing lookup result.

    ``found`` is True only when a ``channels`` row binds the (integration,
    external channel) pair to an agent. The integration may exist without
    a binding (e.g. unmapped channels, DMs); ``channel_integration_id`` and
    ``bot_token`` are populated whenever the integration itself is found, so
    the caller can keep posting in the user's name even while handing off
    to a concierge.
    """

    found: bool
    agent_id: str | None = None
    workspace_id: str | None = None
    channel_integration_id: str | None = None
    bot_token: str | None = None


class DeleteOutput(BaseModel):
    success: bool


# ── Helpers ─────────────────────────────────────────────────────────


def _serialize_integration(
    inst: ChannelIntegration,
) -> ChannelIntegrationOutput:
    return ChannelIntegrationOutput(
        id=str(inst.id),
        workspace_id=str(inst.workspace_id),
        channel_type=inst.channel_type,
        external_id=inst.external_id,
        created_at=inst.created_at.isoformat() if inst.created_at else None,
    )


def _serialize_channel(ch: Channel) -> ChannelOutput:
    return ChannelOutput(
        id=str(ch.id),
        channel_integration_id=str(ch.channel_integration_id),
        external_channel_id=ch.external_channel_id,
        agent_id=str(ch.agent_id),
        created_at=ch.created_at.isoformat() if ch.created_at else None,
    )


async def _maybe_post_slack_mapping_confirmation(
    db, ch: Channel, *, agent_name: str, notify: bool
) -> None:
    """Post a short in-channel message after a dashboard/API bind (best-effort)."""
    if not notify:
        return
    if ch.external_channel_id.startswith("D"):
        return
    inst_row = await db.execute(
        select(ChannelIntegration).where(
            ChannelIntegration.id == ch.channel_integration_id
        )
    )
    inst = inst_row.scalar_one_or_none()
    if not inst or inst.channel_type != "slack":
        return
    token = _bot_token_from_credentials(
        inst.credentials
        if isinstance(inst.credentials, dict)
        else None
    )
    if not token:
        return
    try:
        result = await _slack_api_call(
            "chat.postMessage",
            {
                "channel": ch.external_channel_id,
                "text": (
                    f"*{agent_name}* added to this channel. "
                ),
            },
            token,
        )
        if not result.get("ok"):
            logger.warning(
                "Slack mapping confirmation not posted: %s (channel=%s)",
                result.get("error"),
                ch.external_channel_id,
            )
    except Exception:
        logger.exception(
            "Slack mapping confirmation post failed (channel=%s)",
            ch.external_channel_id,
        )


def _bot_token_from_credentials(
    credentials: dict[str, Any] | None,
) -> str | None:
    """Slack-specific helper: extract ``bot_token`` from JSONB credentials.

    Lives here (not in ``slack_callback``) because routing reads it inline
    and we want a single shape for what credentials look like.
    """
    if not credentials:
        return None
    token = credentials.get("bot_token")
    return token if isinstance(token, str) and token else None


# ── Integration CRUD ────────────────────────────────────────────────


@function.defn()
async def channel_integration_upsert(
    function_input: ChannelIntegrationUpsertInput,
) -> ChannelIntegrationSingleOutput:
    """Create or update an integration (upsert by ``channel_type`` + ``external_id``)."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(ChannelIntegration).where(
                    ChannelIntegration.channel_type
                    == function_input.channel_type,
                    ChannelIntegration.external_id
                    == function_input.external_id,
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.workspace_id = uuid.UUID(function_input.workspace_id)
                existing.credentials = dict(function_input.credentials)
                await db.commit()
                await db.refresh(existing)
                return ChannelIntegrationSingleOutput(
                    integration=_serialize_integration(existing)
                )

            inst = ChannelIntegration(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(function_input.workspace_id),
                channel_type=function_input.channel_type,
                external_id=function_input.external_id,
                credentials=dict(function_input.credentials),
            )
            db.add(inst)
            await db.commit()
            await db.refresh(inst)
            return ChannelIntegrationSingleOutput(
                integration=_serialize_integration(inst)
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to upsert channel integration: {e!s}"
            ) from e
    return None


@function.defn()
async def channel_integration_get_by_external_id(
    function_input: ChannelIntegrationByExternalIdInput,
) -> ChannelIntegrationSingleOutput:
    """Look up an integration by provider + external_id."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(ChannelIntegration).where(
                    ChannelIntegration.channel_type
                    == function_input.channel_type,
                    ChannelIntegration.external_id
                    == function_input.external_id,
                )
            )
            inst = result.scalar_one_or_none()
            if not inst:
                return ChannelIntegrationSingleOutput(integration=None)
            return ChannelIntegrationSingleOutput(
                integration=_serialize_integration(inst)
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to get channel integration: {e!s}"
            ) from e
    return None


@function.defn()
async def channel_integrations_by_workspace(
    function_input: ChannelIntegrationsByWorkspaceInput,
) -> ChannelIntegrationListOutput:
    """List integrations for a workspace, optionally filtered by provider."""
    async for db in get_async_db():
        try:
            stmt = select(ChannelIntegration).where(
                ChannelIntegration.workspace_id
                == uuid.UUID(function_input.workspace_id)
            )
            if function_input.channel_type:
                stmt = stmt.where(
                    ChannelIntegration.channel_type
                    == function_input.channel_type
                )
            stmt = stmt.order_by(ChannelIntegration.created_at.desc())
            result = await db.execute(stmt)
            integrations = result.scalars().all()
            return ChannelIntegrationListOutput(
                integrations=[
                    _serialize_integration(i) for i in integrations
                ]
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to list channel integrations: {e!s}"
            ) from e
    return None


@function.defn()
async def channel_integration_delete(
    function_input: ChannelIntegrationByExternalIdInput,
) -> DeleteOutput:
    """Delete an integration (cascades to its channels)."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(ChannelIntegration).where(
                    ChannelIntegration.channel_type
                    == function_input.channel_type,
                    ChannelIntegration.external_id
                    == function_input.external_id,
                )
            )
            inst = result.scalar_one_or_none()
            if not inst:
                raise NonRetryableError(
                    message=(
                        f"Integration not found: type={function_input.channel_type} "
                        f"external_id={function_input.external_id}"
                    )
                )
            await db.delete(inst)
            await db.commit()
            return DeleteOutput(success=True)
        except NonRetryableError:
            raise
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete channel integration: {e!s}"
            ) from e
    return None


# ── Channel (binding) CRUD ──────────────────────────────────────────


@function.defn()
async def channel_create(
    function_input: ChannelCreateInput,
) -> ChannelSingleOutput:
    """Bind an external channel to an agent."""
    async for db in get_async_db():
        try:
            ch = Channel(
                id=uuid.uuid4(),
                channel_integration_id=uuid.UUID(
                    function_input.channel_integration_id
                ),
                external_channel_id=function_input.external_channel_id,
                agent_id=uuid.UUID(function_input.agent_id),
            )
            db.add(ch)
            await db.commit()
            await db.refresh(ch)
            ag_row = await db.execute(
                select(Agent).where(Agent.id == ch.agent_id)
            )
            ag = ag_row.scalar_one_or_none()
            agent_name = ag.name if ag else "Agent"
            await _maybe_post_slack_mapping_confirmation(
                db,
                ch,
                agent_name=agent_name,
                notify=function_input.notify_slack,
            )
            return ChannelSingleOutput(channel=_serialize_channel(ch))
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to create channel binding: {e!s}"
            ) from e
    return None


@function.defn()
async def channel_delete(
    function_input: ChannelDeleteInput,
) -> DeleteOutput:
    """Remove a channel binding."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(Channel).where(
                    Channel.id == uuid.UUID(function_input.id)
                )
            )
            ch = result.scalar_one_or_none()
            if not ch:
                raise NonRetryableError(
                    message="Channel binding not found"
                )
            await db.delete(ch)
            await db.commit()
            return DeleteOutput(success=True)
        except NonRetryableError:
            raise
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to delete channel binding: {e!s}"
            ) from e
    return None


@function.defn()
async def channels_by_integration(
    function_input: ChannelsByIntegrationInput,
) -> ChannelListOutput:
    """List all channel bindings for an integration."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(Channel)
                .where(
                    Channel.channel_integration_id
                    == uuid.UUID(function_input.channel_integration_id)
                )
                .order_by(Channel.created_at.desc())
            )
            mappings = result.scalars().all()
            return ChannelListOutput(
                channels=[_serialize_channel(m) for m in mappings]
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to list channel bindings: {e!s}"
            ) from e
    return None


@function.defn()
async def channels_by_workspace(
    function_input: ChannelsByWorkspaceInput,
) -> ChannelWithIntegrationListOutput:
    """List all channel bindings for a workspace, joined with integration data.

    Useful for views that group channels by provider (e.g. the agent-builder
    Channels panel) without paying for one round-trip per integration.
    """
    async for db in get_async_db():
        try:
            stmt = (
                select(
                    Channel,
                    ChannelIntegration.channel_type,
                    ChannelIntegration.external_id,
                )
                .join(
                    ChannelIntegration,
                    Channel.channel_integration_id == ChannelIntegration.id,
                )
                .where(
                    ChannelIntegration.workspace_id
                    == uuid.UUID(function_input.workspace_id)
                )
            )
            if function_input.channel_type:
                stmt = stmt.where(
                    ChannelIntegration.channel_type
                    == function_input.channel_type
                )
            if function_input.agent_ids:
                stmt = stmt.where(
                    Channel.agent_id.in_(
                        [uuid.UUID(a) for a in function_input.agent_ids]
                    )
                )
            stmt = stmt.order_by(Channel.created_at.desc())
            result = await db.execute(stmt)
            rows = result.all()
            return ChannelWithIntegrationListOutput(
                channels=[
                    ChannelWithIntegrationOutput(
                        id=str(ch.id),
                        channel_integration_id=str(ch.channel_integration_id),
                        external_channel_id=ch.external_channel_id,
                        agent_id=str(ch.agent_id),
                        created_at=(
                            ch.created_at.isoformat() if ch.created_at else None
                        ),
                        channel_type=channel_type,
                        external_id=external_id,
                    )
                    for ch, channel_type, external_id in rows
                ]
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to list channels by workspace: {e!s}"
            ) from e
    return None


@function.defn()
async def channel_route_event(
    function_input: ChannelRouteEventInput,
) -> ChannelRouteResult:
    """Resolve provider event → (agent, bot credentials) in one call."""
    async for db in get_async_db():
        try:
            inst_result = await db.execute(
                select(ChannelIntegration).where(
                    ChannelIntegration.channel_type
                    == function_input.channel_type,
                    ChannelIntegration.external_id
                    == function_input.external_id,
                )
            )
            inst = inst_result.scalar_one_or_none()
            if not inst:
                return ChannelRouteResult(found=False)

            bot_token = _bot_token_from_credentials(inst.credentials)

            # Same Slack channel can be bound to more than one agent (unique on
            # integration + external channel + *agent*). Route using the latest
            # mapping so events do not fail with MultipleResultsFound.
            ch_result = await db.execute(
                select(Channel)
                .where(
                    Channel.channel_integration_id == inst.id,
                    Channel.external_channel_id
                    == function_input.external_channel_id,
                )
                .order_by(Channel.created_at.desc())
                .limit(1)
            )
            ch = ch_result.scalars().first()

            if not ch:
                return ChannelRouteResult(
                    found=False,
                    workspace_id=str(inst.workspace_id),
                    bot_token=bot_token,
                    channel_integration_id=str(inst.id),
                )

            return ChannelRouteResult(
                found=True,
                agent_id=str(ch.agent_id),
                workspace_id=str(inst.workspace_id),
                bot_token=bot_token,
                channel_integration_id=str(inst.id),
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to route channel event: {e!s}"
            ) from e
    return None
