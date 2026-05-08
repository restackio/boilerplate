"""CRUD activities for polymorphic channel integrations.

These work across any messaging provider (currently Slack; future: Telegram,
WhatsApp, iMessage). Provider-shaped data lives in ``credentials`` JSONB on
``channel_integrations`` and is opaque at this layer.

Routing model: explicit ``channels`` row → agent. No connected agent →
caller falls through to a per-provider concierge LLM.
"""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from restack_ai.function import NonRetryableError, function
from sqlalchemy import select

from src.database.connection import get_async_db
from src.database.models import (
    Agent,
    Channel,
    ChannelIntegration,
    User,
)

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
    welcome_pending: bool = Field(
        default=False,
        description=(
            "Mark the connection as awaiting an in-channel welcome. Used "
            "for private Slack channels where the bot can't self-join: a "
            "member_joined_channel listener consumes the flag once the "
            "user runs /invite (or @-mentions the bot)."
        ),
    )
    connected_by_user_id: str | None = Field(
        default=None,
        description=(
            "Restack user id of whoever initiated the connection. Stored "
            "so a deferred welcome message can attribute the connection "
            "to the right person even if it fires hours later."
        ),
    )


class ChannelConsumePendingWelcomeInput(BaseModel):
    """Input for atomically reading + clearing a pending-welcome flag.

    Caller supplies the provider-side identifiers (e.g. Slack ``team_id``
    + ``channel_id``) so the slack-bot listener doesn't need a separate
    integration lookup before this call.
    """

    channel_type: str = Field(..., min_length=1)
    external_id: str = Field(
        ...,
        min_length=1,
        description="Provider workspace id (e.g. Slack team_id).",
    )
    external_channel_id: str = Field(..., min_length=1)


class ChannelConsumePendingWelcomeOutput(BaseModel):
    """Result of ``channel_consume_pending_welcome``.

    ``found`` is true only when there was an unconsumed pending welcome.
    The ``agent_*`` and ``connected_by_*`` fields populate the welcome
    message so the slack-bot listener doesn't need additional round-trips.
    """

    found: bool
    channel_id: str | None = None
    agent_id: str | None = None
    agent_name: str | None = None
    connected_by_user_name: str | None = None


class ChannelDeleteInput(BaseModel):
    id: str = Field(..., min_length=1)


class ChannelMarkWelcomePendingInput(BaseModel):
    """Input for flipping welcome_pending=true on an existing channel row.

    Used by ``slackconnectchannel`` when the auto-join probe returns
    ``requires_invite=true`` — the row was already created with the
    default ``welcome_pending=false`` and now needs to wait for the
    user's /invite or @-mention.
    """

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
    """Result of a single-integration operation.

    ``error`` is set (and ``integration`` is None) when the operation
    soft-fails for a known reason that callers should handle, rather
    than propagating as an exception. Known codes:

    - ``already_connected_elsewhere`` — the same provider workspace
      (``channel_type`` + ``external_id``) is currently linked to a
      different Restack workspace; the install is refused to prevent
      cross-tenant token leakage.
    """

    integration: ChannelIntegrationOutput | None = None
    error: str | None = None


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
    a connected agent (e.g. unconfigured channels, DMs);
    ``channel_integration_id`` and ``bot_token`` are populated whenever
    the integration itself is found, so the caller can keep posting in
    the user's name even while handing off to a concierge.
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
    """Create / refresh an integration, refusing cross-workspace takeover.

    Rules:

    * No existing row for ``(channel_type, external_id)`` → insert.
    * Existing row with the **same** ``workspace_id`` → refresh
      ``credentials`` (token rotation; matches re-OAuth conventions).
    * Existing row with a **different** ``workspace_id`` → soft-fail with
      ``error="already_connected_elsewhere"``. The previous binding is
      preserved untouched. The caller (Slack OAuth callback) is expected
      to render a clear "ask the other workspace's admin to disconnect
      first" message instead of pretending the install worked.

    The hard-block exists because ``channel_type`` + ``external_id`` is a
    globally-unique tuple (Slack only issues one bot token per app+team
    pair). Silently moving the row would hand workspace B a token
    workspace A is still posting with — a cross-tenant leak. We may
    revisit with an explicit, double-confirmed transfer flow later.
    """
    workspace_uuid = uuid.UUID(function_input.workspace_id)
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
                if existing.workspace_id != workspace_uuid:
                    # Different Restack workspace owns this provider
                    # workspace. Refuse the takeover; do not mutate
                    # anything.
                    return ChannelIntegrationSingleOutput(
                        integration=None,
                        error="already_connected_elsewhere",
                    )

                existing.credentials = dict(function_input.credentials)
                await db.commit()
                await db.refresh(existing)
                return ChannelIntegrationSingleOutput(
                    integration=_serialize_integration(existing)
                )

            inst = ChannelIntegration(
                id=uuid.uuid4(),
                workspace_id=workspace_uuid,
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
                welcome_pending=bool(function_input.welcome_pending),
                connected_by_user_id=(
                    uuid.UUID(function_input.connected_by_user_id)
                    if function_input.connected_by_user_id
                    else None
                ),
            )
            db.add(ch)
            await db.commit()
            await db.refresh(ch)
            return ChannelSingleOutput(channel=_serialize_channel(ch))
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to create channel binding: {e!s}"
            ) from e
    return None


@function.defn()
async def channel_mark_welcome_pending(
    function_input: ChannelMarkWelcomePendingInput,
) -> ChannelSingleOutput:
    """Set ``welcome_pending=true`` on an existing channel row."""
    async for db in get_async_db():
        try:
            result = await db.execute(
                select(Channel).where(
                    Channel.id == uuid.UUID(function_input.id)
                )
            )
            ch = result.scalar_one_or_none()
            if ch is None:
                raise NonRetryableError(
                    message=f"Channel {function_input.id} not found"
                )
            ch.welcome_pending = True
            await db.commit()
            await db.refresh(ch)
            return ChannelSingleOutput(channel=_serialize_channel(ch))
        except NonRetryableError:
            raise
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to mark welcome pending: {e!s}"
            ) from e
    return None


@function.defn()
async def channel_consume_pending_welcome(
    function_input: ChannelConsumePendingWelcomeInput,
) -> ChannelConsumePendingWelcomeOutput:
    """Atomically read + clear the welcome_pending flag for a channel.

    Called by the slack-bot's ``member_joined_channel`` listener when the
    bot itself joins a channel. If the channel has a pending welcome we
    return the agent + user names needed to render the message, and clear
    the flag in the same transaction so concurrent joins (e.g. a flaky
    Slack delivery) don't re-post.

    The lookup uses ``(channel_integration_id, external_channel_id)``
    because connections are not constrained 1:1 with channels at the
    schema level (an agent can hypothetically be connected to many
    channels). We pick the most recently-connected pending row and
    attribute the welcome to that one. In practice today this is also
    1:1 since the agent builder only allows one agent per channel.
    """
    async for db in get_async_db():
        try:
            inst_result = await db.execute(
                select(ChannelIntegration.id).where(
                    ChannelIntegration.channel_type
                    == function_input.channel_type,
                    ChannelIntegration.external_id
                    == function_input.external_id,
                )
            )
            integration_id = inst_result.scalar_one_or_none()
            if integration_id is None:
                return ChannelConsumePendingWelcomeOutput(found=False)

            stmt = (
                select(Channel)
                .where(
                    Channel.channel_integration_id == integration_id,
                    Channel.external_channel_id
                    == function_input.external_channel_id,
                    Channel.welcome_pending.is_(True),
                )
                .order_by(Channel.created_at.desc())
                .limit(1)
            )
            result = await db.execute(stmt)
            ch = result.scalar_one_or_none()
            if ch is None:
                return ChannelConsumePendingWelcomeOutput(found=False)

            agent_name: str | None = None
            connected_by_user_name: str | None = None

            agent_result = await db.execute(
                select(Agent.name).where(Agent.id == ch.agent_id)
            )
            agent_name = agent_result.scalar_one_or_none()

            if ch.connected_by_user_id is not None:
                user_result = await db.execute(
                    select(User.name).where(
                        User.id == ch.connected_by_user_id
                    )
                )
                connected_by_user_name = user_result.scalar_one_or_none()

            ch.welcome_pending = False
            await db.commit()
            await db.refresh(ch)

            return ChannelConsumePendingWelcomeOutput(
                found=True,
                channel_id=str(ch.id),
                agent_id=str(ch.agent_id),
                agent_name=agent_name,
                connected_by_user_name=connected_by_user_name,
            )
        except Exception as e:
            await db.rollback()
            raise NonRetryableError(
                message=f"Failed to consume pending welcome: {e!s}"
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
            rows = result.scalars().all()
            return ChannelListOutput(
                channels=[_serialize_channel(row) for row in rows]
            )
        except Exception as e:
            raise NonRetryableError(
                message=f"Failed to list connected channels: {e!s}"
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

            ch_result = await db.execute(
                select(Channel).where(
                    Channel.channel_integration_id == inst.id,
                    Channel.external_channel_id
                    == function_input.external_channel_id,
                )
            )
            ch = ch_result.scalar_one_or_none()

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
