"""MCP tool: bind a Slack channel to the agent under construction.

Creates a row in ``channels`` so Slack messages in that channel get routed
to the agent. Expected sequence:

    slackcheckconnection -> slacklistchannels -> slackbindchannel
"""

from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow


class SlackBindChannelInput(BaseModel):
    """Input for binding a Slack channel to an agent."""

    workspace_id: str = Field(
        ...,
        description="Workspace id (from meta_info.workspace_id).",
    )
    agent_id: str = Field(
        ...,
        description=(
            "The agent to bind. During a build, use the just-created agent's "
            "id (the parent/interactive one that talks to Slack users)."
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
            "installation the binding belongs to."
        ),
    )


class SlackBindChannelOutput(BaseModel):
    success: bool
    channel_id: str | None = Field(
        default=None, description="ID of the newly created channel binding row."
    )
    channel_name: str | None = None
    bot_joined: bool = Field(
        default=False,
        description=(
            "True when the bot is now a member of the channel (auto-joined "
            "or already a member). When false, the user must run "
            "'/invite @<bot>' before the agent can post replies."
        ),
    )
    requires_invite: bool = Field(
        default=False,
        description=(
            "True when Slack refused to auto-join (e.g. private channel). "
            "Tell the user to run '/invite @<bot>' in that channel."
        ),
    )
    join_missing_scope: bool = Field(
        default=False,
        description=(
            "True when the installation lacks 'channels:join'. Suggest the "
            "user reconnect Slack to grant updated permissions."
        ),
    )
    error: str | None = Field(
        default=None,
        description=(
            "Error code. 'channel_already_bound' when this exact "
            "(installation, channel, agent) mapping already exists."
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
                    "external_id": getattr(item, "external_id", "") or "",
                    "channel_type": getattr(item, "channel_type", "") or "",
                }
            )
    return out


def _integration_id_from_single(result: Any) -> tuple[str | None, str | None]:
    """Return (integration_id, external_id) from a single-integration result."""
    inst: Any
    if isinstance(result, dict):
        inst = result.get("integration")
    else:
        inst = getattr(result, "integration", None)
    if inst is None:
        return None, None
    if isinstance(inst, dict):
        return inst.get("id") or None, inst.get("external_id") or None
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


_ALREADY_BOUND_HINTS = (
    "duplicate key",
    "unique constraint",
    "uniqueviolation",
    "already exists",
)


def _is_already_bound_error(message: str) -> bool:
    lowered = message.lower()
    return any(h in lowered for h in _ALREADY_BOUND_HINTS)


def _join_result_from(result: Any) -> tuple[bool, bool, bool, str | None]:
    """Return (ok, requires_invite, missing_scope, error) from a join step."""
    if isinstance(result, dict):
        ok = bool(result.get("ok"))
        already = bool(result.get("already_member"))
        requires_invite = bool(result.get("requires_invite"))
        missing_scope = bool(result.get("missing_scope"))
        error = result.get("error")
    else:
        ok = bool(getattr(result, "ok", False))
        already = bool(getattr(result, "already_member", False))
        requires_invite = bool(getattr(result, "requires_invite", False))
        missing_scope = bool(getattr(result, "missing_scope", False))
        error = getattr(result, "error", None)
    # already_member implies success either way.
    return ok or already, requires_invite, missing_scope, error


@workflow.defn(
    mcp=True,
    name="SlackBindChannel",
    description=(
        "Bind a Slack channel to the agent under construction so messages "
        "posted there are routed to this agent. Call after slacklistchannels "
        "and after the user picks a channel. Pass workspace_id and agent_id "
        "from meta_info; channel_id from slacklistchannels. If the returned "
        "channel was is_member=false, remind the user to '/invite @<bot>' in "
        "that channel before expecting replies."
    ),
)
class SlackBindChannel:
    """Wrap the backend's channel_create activity (Slack-flavoured)."""

    @workflow.run
    async def run(  # noqa: C901, PLR0911, PLR0912
        self, workflow_input: SlackBindChannelInput
    ) -> SlackBindChannelOutput:
        team_id = (workflow_input.team_id or "").strip()
        log.info(
            "SlackBindChannel started",
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
                    "SlackBindChannel: integration lookup failed",
                    error=str(e),
                )
                return SlackBindChannelOutput(
                    success=False,
                    error=f"Failed to resolve installation: {e!s}",
                )
            integration_id, _ = _integration_id_from_single(inst_result)
            if not integration_id:
                return SlackBindChannelOutput(
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
                    "SlackBindChannel: installations lookup failed",
                    error=str(e),
                )
                return SlackBindChannelOutput(
                    success=False,
                    error=f"Failed to resolve Slack installation: {e!s}",
                )

            integrations = _integrations_from(list_result)
            if not integrations:
                return SlackBindChannelOutput(
                    success=False,
                    error=(
                        "Workspace has no Slack installation. Call "
                        "slackcheckconnection first."
                    ),
                )
            if len(integrations) > 1:
                return SlackBindChannelOutput(
                    success=False,
                    error=(
                        "Workspace has multiple Slack installations; pass "
                        "team_id explicitly."
                    ),
                )
            integration_id = integrations[0].get("id") or None
            if not integration_id:
                return SlackBindChannelOutput(
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
                    "agent_id": workflow_input.agent_id,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:  # noqa: BLE001
            message = str(e)
            if _is_already_bound_error(message):
                log.info("SlackBindChannel: channel already bound")
                return SlackBindChannelOutput(
                    success=False,
                    channel_name=workflow_input.channel_name or None,
                    error="channel_already_bound",
                )
            log.error("SlackBindChannel: create failed", error=message)
            return SlackBindChannelOutput(
                success=False,
                error=f"Failed to bind channel: {message}",
            )

        new_channel_id = _channel_id_from(create_result)
        if not new_channel_id:
            return SlackBindChannelOutput(
                success=False,
                error="Backend did not return a channel id",
            )

        # Best-effort: join the channel as the bot so the user doesn't have
        # to /invite manually. Slack only allows this for public channels;
        # private channels return requires_invite and we surface that.
        bot_joined = False
        requires_invite = False
        join_missing_scope = False
        if team_id:
            try:
                join_result = await workflow.step(
                    function="slack_join_channel",
                    function_input={
                        "slack_team_id": team_id,
                        "channel_id": workflow_input.channel_id,
                    },
                    task_queue="backend",
                    start_to_close_timeout=timedelta(seconds=15),
                )
                bot_joined, requires_invite, join_missing_scope, join_err = (
                    _join_result_from(join_result)
                )
                if not bot_joined and not requires_invite:
                    log.info(
                        "SlackBindChannel: auto-join did not succeed",
                        error=join_err,
                        missing_scope=join_missing_scope,
                    )
            except Exception as e:  # noqa: BLE001
                log.warning(
                    "SlackBindChannel: join step failed (binding still ok)",
                    error=str(e),
                )
        else:
            log.warning(
                "SlackBindChannel: skipping auto-join, no team_id resolved"
            )

        return SlackBindChannelOutput(
            success=True,
            channel_id=new_channel_id,
            channel_name=workflow_input.channel_name or None,
            bot_joined=bot_joined,
            requires_invite=requires_invite,
            join_missing_scope=join_missing_scope,
        )
