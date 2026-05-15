"""MCP tool: connect a Slack channel to the agent under construction.

Creates a row in ``channels`` so Slack messages in that channel get routed
to the agent. Expected sequence:

    slackcheckconnection -> slacklistchannels -> slackconnectchannel

Auto-join behaviour:

* For **public** channels the bot joins automatically via
  ``conversations.join`` so the user never needs to ``/invite`` it.
* For **private** channels Slack's API does not allow a bot to join
  itself; the user must run ``/invite @<bot>``. This is a Slack platform
  constraint, not a missing feature on our side.

Welcome message:

After a fresh join (i.e. the bot was not already a member) the workflow
posts a short welcome message to the channel attributing the connection
to the Restack user that triggered the agent builder run.
"""

from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow


class SlackConnectChannelInput(BaseModel):
    """Input for connecting a Slack channel to an agent."""

    workspace_id: str = Field(
        ...,
        description="Workspace id (from meta_info.workspace_id).",
    )
    agent_id: str = Field(
        ...,
        description=(
            "The agent to connect. During a build, use the just-created "
            "agent's id (the parent/interactive one that talks to Slack "
            "users)."
        ),
    )
    channel_id: str = Field(
        ...,
        description="Slack channel id (e.g. C01234ABC) from slacklistchannels.",
    )
    channel_name: str = Field(
        default="",
        description="Channel name without the '#' prefix; for display only.",
    )
    team_id: str | None = Field(
        default=None,
        description=(
            "Slack team id (e.g. T01234ABC). Optional when the workspace has "
            "a single installation; required otherwise so we know which "
            "installation the connection belongs to."
        ),
    )
    connected_by_user_id: str | None = Field(
        default=None,
        description=(
            "Restack user id (from meta_info.user_id) who initiated the "
            "connection. Used to attribute the welcome message posted in the "
            "channel after a fresh join."
        ),
    )


class SlackConnectChannelOutput(BaseModel):
    success: bool
    channel_id: str | None = Field(
        default=None,
        description="ID of the newly created channel row.",
    )
    channel_name: str | None = None
    bot_joined: bool = Field(
        default=False,
        description=(
            "True when the bot is now a member of the channel (auto-joined "
            "or already a member). When false (private channel), the user "
            "must run '/invite @<bot>' before the agent can post replies."
        ),
    )
    requires_invite: bool = Field(
        default=False,
        description=(
            "True ONLY for private channels: Slack's API does not allow a "
            "bot to self-join private channels. The user must add the bot "
            "themselves; the recommended path is to type '@<bot>' in the "
            "channel and click 'Invite Them' on the prompt Slack shows. "
            "'/invite @<bot>' also works. Public channels never set this; "
            "they are auto-joined."
        ),
    )
    join_missing_scope: bool = Field(
        default=False,
        description=(
            "True when the installation lacks 'channels:join'. Suggest the "
            "user reconnect Slack to grant updated permissions."
        ),
    )
    welcome_posted: bool = Field(
        default=False,
        description=(
            "True when a welcome message was posted in the channel during "
            "this call (i.e. the bot auto-joined a public channel). For "
            "private channels the welcome is deferred until the user "
            "invites the bot — see welcome_pending."
        ),
    )
    welcome_pending: bool = Field(
        default=False,
        description=(
            "True when a welcome message is queued to fire on the next "
            "member_joined_channel event. Set for private channels where "
            "the bot can't self-join. Reassure the user that the agent "
            "will say hello in the channel as soon as they invite the bot."
        ),
    )
    channel_deep_link: str | None = Field(
        default=None,
        description=(
            "Universal Slack deep link that opens the channel in Slack "
            "(desktop / mobile / browser). Show this to the user when "
            "requires_invite=true so they can jump straight to the channel "
            "and add the bot. Falsy for missing team_id / channel_id."
        ),
    )
    error: str | None = Field(
        default=None,
        description=(
            "Error code. 'channel_already_connected' when this channel is "
            "already connected to this agent in this installation."
        ),
    )


def _integrations_from(result: Any) -> list[dict[str, Any]]:
    """Return ``channel_integrations_by_workspace`` rows as plain dicts."""
    raw: Any
    if isinstance(result, dict):
        raw = result.get("integrations") or []
    else:
        raw = getattr(result, "integrations", None) or []
    out: list[dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict):
            out.append(item)
        else:
            out.append(
                {
                    "id": getattr(item, "id", "") or "",
                    "external_id": getattr(
                        item, "external_id", ""
                    )
                    or "",
                    "channel_type": getattr(
                        item, "channel_type", ""
                    )
                    or "",
                }
            )
    return out


def _integration_id_from_single(
    result: Any,
) -> tuple[str | None, str | None]:
    """Return (integration_id, external_id) from a single-integration result."""
    inst: Any
    if isinstance(result, dict):
        inst = result.get("integration")
    else:
        inst = getattr(result, "integration", None)
    if inst is None:
        return None, None
    if isinstance(inst, dict):
        return inst.get("id") or None, inst.get(
            "external_id"
        ) or None
    return (
        getattr(inst, "id", None),
        getattr(inst, "external_id", None),
    )


def _channel_id_from(result: Any) -> str | None:
    inst: Any
    if isinstance(result, dict):
        inst = result.get("channel")
    else:
        inst = getattr(result, "channel", None)
    if inst is None:
        return None
    if isinstance(inst, dict):
        return inst.get("id") or None
    return getattr(inst, "id", None)


# Postgres / SQLAlchemy unique-violation hints surfaced through Temporal's
# ``ApplicationError`` machinery. We map any of these to the structured
# ``channel_already_connected`` error code so callers (and the LLM prompt)
# can render a friendly message.
_ALREADY_CONNECTED_HINTS = (
    "duplicate key",
    "unique constraint",
    "uniqueviolation",
    "already exists",
)


def _is_already_connected_error(message: str) -> bool:
    lowered = message.lower()
    return any(h in lowered for h in _ALREADY_CONNECTED_HINTS)


def _join_result_from(
    result: Any,
) -> tuple[bool, bool, bool, bool, str | None]:
    """Return (ok, already_member, requires_invite, missing_scope, error)."""
    if isinstance(result, dict):
        ok = bool(result.get("ok"))
        already = bool(result.get("already_member"))
        requires_invite = bool(result.get("requires_invite"))
        missing_scope = bool(result.get("missing_scope"))
        error = result.get("error")
    else:
        ok = bool(getattr(result, "ok", False))
        already = bool(getattr(result, "already_member", False))
        requires_invite = bool(
            getattr(result, "requires_invite", False)
        )
        missing_scope = bool(
            getattr(result, "missing_scope", False)
        )
        error = getattr(result, "error", None)
    return (
        ok or already,
        already,
        requires_invite,
        missing_scope,
        error,
    )


def _user_name_from(result: Any) -> str | None:
    if result is None:
        return None
    user: Any
    if isinstance(result, dict):
        user = result.get("user")
    else:
        user = getattr(result, "user", None)
    if user is None:
        return None
    if isinstance(user, dict):
        return user.get("name") or None
    return getattr(user, "name", None) or None


def _agent_name_from(result: Any) -> str | None:
    if result is None:
        return None
    agent: Any
    if isinstance(result, dict):
        agent = result.get("agent")
    else:
        agent = getattr(result, "agent", None)
    if agent is None:
        return None
    if isinstance(agent, dict):
        return agent.get("name") or None
    return getattr(agent, "name", None) or None


def _slack_channel_deep_link(
    team_id: str, channel_id: str
) -> str | None:
    """Build a universal Slack deep link to a channel.

    Returns ``https://slack.com/app_redirect?...`` because that URL works
    in every client: desktop, mobile, and the Slack web app. The native
    ``slack://channel?...`` scheme is more direct but only works when
    Slack desktop/mobile is installed; we let Slack itself decide.
    """
    if not team_id or not channel_id:
        return None
    return f"https://slack.com/app_redirect?channel={channel_id}&team={team_id}"


@workflow.defn(
    mcp=True,
    name="SlackConnectChannel",
    description=(
        "Connect a Slack channel to the agent under construction so messages "
        "posted there are routed to this agent. Call after slacklistchannels "
        "and after the user picks a channel. Pass workspace_id, agent_id, "
        "channel_id, channel_name from slacklistchannels, and "
        "connected_by_user_id from meta_info.user_id (used to attribute the "
        "in-channel welcome message). For PUBLIC channels: the bot "
        "auto-joins and posts a welcome immediately (welcome_posted=true). "
        "For PRIVATE channels: Slack does not permit a bot to self-join, so "
        "requires_invite=true is returned along with a channel_deep_link. "
        "Show the deep link to the user and tell them to type @<bot> in "
        "the channel and click 'Invite Them' on the prompt Slack shows "
        "(or run /invite @<bot>). The agent will post a welcome "
        "automatically as soon as they do — the connection is queued "
        "(welcome_pending=true). Do NOT tell the user to invite the bot "
        "when requires_invite=false."
    ),
)
class SlackConnectChannel:
    """Wrap the backend's channel_create activity (Slack-flavoured)."""

    @workflow.run
    async def run(  # noqa: C901, PLR0911, PLR0912
        self, workflow_input: SlackConnectChannelInput
    ) -> SlackConnectChannelOutput:
        team_id = (workflow_input.team_id or "").strip()
        log.info(
            "SlackConnectChannel started",
            workspace_id=workflow_input.workspace_id,
            agent_id=workflow_input.agent_id,
            channel_id=workflow_input.channel_id,
            team_id=team_id or None,
        )

        integration_id: str | None = None
        if team_id:
            try:
                inst_result = await workflow.step(
                    function="channel_integration_get_by_external_id",
                    function_input={
                        "channel_type": "slack",
                        "external_id": team_id,
                    },
                    task_queue="backend",
                    start_to_close_timeout=timedelta(seconds=15),
                )
            except Exception as e:  # noqa: BLE001
                log.error(
                    "SlackConnectChannel: integration lookup failed",
                    error=str(e),
                )
                return SlackConnectChannelOutput(
                    success=False,
                    error=f"Failed to resolve installation: {e!s}",
                )
            integration_id, _ = _integration_id_from_single(
                inst_result
            )
            if not integration_id:
                return SlackConnectChannelOutput(
                    success=False,
                    error=f"No Slack installation found for team_id={team_id}",
                )
        else:
            try:
                list_result = await workflow.step(
                    function="channel_integrations_by_workspace",
                    function_input={
                        "workspace_id": workflow_input.workspace_id,
                        "channel_type": "slack",
                    },
                    task_queue="backend",
                    start_to_close_timeout=timedelta(seconds=15),
                )
            except Exception as e:  # noqa: BLE001
                log.error(
                    "SlackConnectChannel: installations lookup failed",
                    error=str(e),
                )
                return SlackConnectChannelOutput(
                    success=False,
                    error=f"Failed to resolve Slack installation: {e!s}",
                )

            integrations = _integrations_from(list_result)
            if not integrations:
                return SlackConnectChannelOutput(
                    success=False,
                    error=(
                        "Workspace has no Slack installation. Call "
                        "slackcheckconnection first."
                    ),
                )
            if len(integrations) > 1:
                return SlackConnectChannelOutput(
                    success=False,
                    error=(
                        "Workspace has multiple Slack installations; pass "
                        "team_id explicitly."
                    ),
                )
            integration_id = integrations[0].get("id") or None
            if not integration_id:
                return SlackConnectChannelOutput(
                    success=False,
                    error="Integration record is missing an id",
                )
            # Capture team_id from the single integration so we can call
            # conversations.join below without an extra lookup.
            team_id = integrations[0].get("external_id") or ""

        try:
            create_result = await workflow.step(
                function="channel_create",
                function_input={
                    "channel_integration_id": integration_id,
                    "external_channel_id": workflow_input.channel_id,
                    # Snapshot the picker-side name so the integrations page
                    # shows ``#general`` immediately, before the background
                    # refresh runs. A subsequent refresh keeps it in sync
                    # with renames on Slack's side.
                    "external_channel_name": (
                        workflow_input.channel_name or None
                    ),
                    "agent_id": workflow_input.agent_id,
                    # Persist the connecting user up front so a deferred
                    # welcome (private channels) can attribute correctly
                    # even if it fires hours after the connect step.
                    "connected_by_user_id": (
                        workflow_input.connected_by_user_id
                        or None
                    ),
                    # Default false: public channels post the welcome
                    # immediately below. Flipped to true after the join
                    # probe if Slack reports requires_invite=true.
                    "welcome_pending": False,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:  # noqa: BLE001
            message = str(e)
            if _is_already_connected_error(message):
                log.info(
                    "SlackConnectChannel: channel already connected"
                )
                return SlackConnectChannelOutput(
                    success=False,
                    channel_name=workflow_input.channel_name
                    or None,
                    error="channel_already_connected",
                )
            log.error(
                "SlackConnectChannel: create failed",
                error=message,
            )
            return SlackConnectChannelOutput(
                success=False,
                error=f"Failed to connect channel: {message}",
            )

        new_channel_id = _channel_id_from(create_result)
        if not new_channel_id:
            return SlackConnectChannelOutput(
                success=False,
                error="Backend did not return a channel id",
            )

        # Best-effort: join the channel as the bot so the user doesn't have
        # to /invite manually. Slack only allows this for public channels;
        # private channels return requires_invite and we surface that.
        bot_joined = False
        already_member = False
        requires_invite = False
        join_missing_scope = False
        if team_id:
            try:
                join_result = await workflow.step(
                    function="slack_join_channel",
                    function_input={
                        "slack_team_id": team_id,
                        "workspace_id": workflow_input.workspace_id,
                        "channel_id": workflow_input.channel_id,
                    },
                    task_queue="backend",
                    start_to_close_timeout=timedelta(seconds=15),
                )
                (
                    bot_joined,
                    already_member,
                    requires_invite,
                    join_missing_scope,
                    join_err,
                ) = _join_result_from(join_result)
                if not bot_joined and not requires_invite:
                    log.info(
                        "SlackConnectChannel: auto-join did not succeed",
                        error=join_err,
                        missing_scope=join_missing_scope,
                    )
            except Exception as e:  # noqa: BLE001
                log.warning(
                    "SlackConnectChannel: join step failed (connect ok)",
                    error=str(e),
                )
        else:
            log.warning(
                "SlackConnectChannel: skipping auto-join, no team_id resolved"
            )

        # Welcome message dispatch:
        # * Public channel (auto-joined fresh): post the welcome now.
        # * Public channel (already a member): no welcome — would be spam.
        # * Private channel (requires_invite): defer. We mark
        #   welcome_pending=true so the slack-bot's
        #   member_joined_channel listener posts the welcome the moment
        #   the user runs /invite (or @-mentions the bot and clicks
        #   "Invite Them" on Slack's prompt).
        welcome_posted = False
        welcome_pending = False
        if bot_joined and not already_member and team_id:
            welcome_posted = await self._post_welcome_message(
                workspace_id=workflow_input.workspace_id,
                team_id=team_id,
                channel_id=workflow_input.channel_id,
                agent_id=workflow_input.agent_id,
                connected_by_user_id=workflow_input.connected_by_user_id,
            )
        elif requires_invite:
            welcome_pending = await self._mark_welcome_pending(
                channel_id=new_channel_id
            )

        return SlackConnectChannelOutput(
            success=True,
            channel_id=new_channel_id,
            channel_name=workflow_input.channel_name or None,
            bot_joined=bot_joined,
            requires_invite=requires_invite,
            join_missing_scope=join_missing_scope,
            welcome_posted=welcome_posted,
            welcome_pending=welcome_pending,
            channel_deep_link=_slack_channel_deep_link(
                team_id, workflow_input.channel_id
            ),
        )

    async def _mark_welcome_pending(
        self, *, channel_id: str
    ) -> bool:
        """Flip welcome_pending=true on the channel row.

        Called for private channels so the deferred welcome fires when
        the user invites the bot. Best-effort: a failure here does not
        roll back the connection, the user just won't see the welcome.
        """
        try:
            await workflow.step(
                function="channel_mark_welcome_pending",
                function_input={"id": channel_id},
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=15),
            )
        except Exception as e:  # noqa: BLE001
            log.warning(
                "SlackConnectChannel: failed to mark welcome_pending",
                error=str(e),
            )
            return False
        return True

    async def _post_welcome_message(
        self,
        *,
        workspace_id: str,
        team_id: str,
        channel_id: str,
        agent_id: str,
        connected_by_user_id: str | None,
    ) -> bool:
        """Post a welcome message in the channel after a fresh join."""
        agent_name: str | None = None
        connected_by_name: str | None = None

        try:
            agent_result = await workflow.step(
                function="agents_get_by_id",
                function_input={"agent_id": agent_id},
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=15),
            )
            agent_name = _agent_name_from(agent_result)
        except Exception as e:  # noqa: BLE001
            log.warning(
                "SlackConnectChannel: failed to fetch agent name",
                error=str(e),
            )

        if connected_by_user_id:
            try:
                user_result = await workflow.step(
                    function="users_get_by_id",
                    function_input={
                        "user_id": connected_by_user_id
                    },
                    task_queue="backend",
                    start_to_close_timeout=timedelta(seconds=15),
                )
                connected_by_name = _user_name_from(user_result)
            except Exception as e:  # noqa: BLE001
                log.warning(
                    "SlackConnectChannel: failed to fetch connecting user",
                    error=str(e),
                )

        agent_display = agent_name or "Restack agent"
        if connected_by_name:
            text = (
                f"👋 Hi! I'm *{agent_display}*. I was just connected to this "
                f"channel by *{connected_by_name}*. Mention me with "
                f"`@{agent_display}` or send me a DM to get started."
            )
        else:
            text = (
                f"👋 Hi! I'm *{agent_display}*. I was just connected to this "
                f"channel. Mention me with `@{agent_display}` or send me a "
                f"DM to get started."
            )

        try:
            await workflow.step(
                function="slack_post_message",
                function_input={
                    "channel": channel_id,
                    "text": text,
                    "slack_team_id": team_id,
                    "workspace_id": workspace_id,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=15),
            )
        except Exception as e:  # noqa: BLE001
            log.warning(
                "SlackConnectChannel: failed to post welcome message",
                error=str(e),
            )
            return False
        return True
