"""MCP tool: list Slack channels visible to the installation.

Designed to be called after ``slackcheckconnection`` confirms at least one
installation exists. When the workspace has a single installation, the
``team_id`` argument can be omitted — the tool resolves it automatically.
"""

from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow


class SlackListChannelsInput(BaseModel):
    """Input for listing channels in the workspace's Slack installation."""

    workspace_id: str = Field(
        ...,
        description="Workspace id (from meta_info.workspace_id).",
    )
    team_id: str | None = Field(
        default=None,
        description=(
            "Slack team id (e.g. T01234ABC). Optional when the workspace has "
            "exactly one Slack installation; required otherwise so we know "
            "which workspace to query."
        ),
    )
    include_private: bool = Field(
        default=True,
        description="Include private channels the bot is a member of.",
    )
    limit: int = Field(
        default=200,
        ge=1,
        le=1000,
        description="Maximum channels to return.",
    )


class SlackChannelSummary(BaseModel):
    id: str = Field(
        ..., description="Slack channel id (e.g. C01234ABC)."
    )
    name: str = Field(
        ..., description="Channel name without the '#' prefix."
    )
    is_private: bool = False
    is_member: bool = Field(
        default=False,
        description=(
            "Whether the bot is a member of this channel. If false, remind the "
            "user to run '/invite @<bot>' in that channel before expecting "
            "replies to post there."
        ),
    )


class SlackListChannelsOutput(BaseModel):
    success: bool
    channels: list[SlackChannelSummary] = Field(
        default_factory=list
    )
    team_id: str | None = Field(
        default=None,
        description="The team_id the channels were listed for.",
    )
    private_channels_unavailable: bool = Field(
        default=False,
        description=(
            "True when the installation lacks groups:read so only public "
            "channels are returned. If the user needs a private channel, "
            "tell them to reinstall the Slack app to grant channel read "
            "permissions (call slackcheckconnection again to get a fresh URL)."
        ),
    )
    error: str | None = None


def _team_ids_from(result: Any) -> list[str]:
    """Coerce ``channel_integrations_by_workspace`` results into team_ids."""
    raw: Any
    if isinstance(result, dict):
        raw = result.get("integrations") or []
    else:
        raw = getattr(result, "integrations", None) or []
    out: list[str] = []
    for item in raw:
        if isinstance(item, dict):
            external_id = item.get("external_id") or ""
        else:
            external_id = getattr(item, "external_id", "") or ""
        if external_id:
            out.append(external_id)
    return out


def _channels_from(
    result: Any,
) -> tuple[bool, list[SlackChannelSummary], str | None, bool]:
    if isinstance(result, dict):
        ok = bool(result.get("ok"))
        channels_raw = result.get("channels") or []
        error = result.get("error")
        private_unavailable = bool(
            result.get("private_channels_unavailable")
        )
    else:
        ok = bool(getattr(result, "ok", False))
        channels_raw = getattr(result, "channels", None) or []
        error = getattr(result, "error", None)
        private_unavailable = bool(
            getattr(result, "private_channels_unavailable", False)
        )

    channels: list[SlackChannelSummary] = []
    for ch in channels_raw:
        if isinstance(ch, dict):
            channels.append(
                SlackChannelSummary(
                    id=ch.get("id", ""),
                    name=ch.get("name", ""),
                    is_private=bool(ch.get("is_private")),
                    is_member=bool(ch.get("is_member")),
                )
            )
        else:
            channels.append(
                SlackChannelSummary(
                    id=getattr(ch, "id", "") or "",
                    name=getattr(ch, "name", "") or "",
                    is_private=bool(
                        getattr(ch, "is_private", False)
                    ),
                    is_member=bool(
                        getattr(ch, "is_member", False)
                    ),
                )
            )
    return ok, channels, error, private_unavailable


@workflow.defn(
    mcp=True,
    name="SlackListChannels",
    description=(
        "List Slack channels visible to the connected Slack workspace so the "
        "user can pick one to connect to this agent. Call after "
        "slackcheckconnection confirms connected=true. Pass workspace_id from "
        "meta_info; team_id is optional when there is exactly one "
        "installation. Returns channels with is_member flagged — remind the "
        "user to '/invite @<bot>' in channels where is_member=false."
    ),
)
class SlackListChannels:
    """List channels for a workspace's Slack installation."""

    @workflow.run
    async def run(
        self, workflow_input: SlackListChannelsInput
    ) -> SlackListChannelsOutput:
        team_id = (workflow_input.team_id or "").strip()
        log.info(
            "SlackListChannels started",
            workspace_id=workflow_input.workspace_id,
            team_id=team_id or None,
        )

        if not team_id:
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
                    "SlackListChannels: installations lookup failed",
                    error=str(e),
                )
                return SlackListChannelsOutput(
                    success=False,
                    error=f"Failed to resolve Slack team_id: {e!s}",
                )

            team_ids = _team_ids_from(list_result)
            if not team_ids:
                return SlackListChannelsOutput(
                    success=False,
                    error=(
                        "Workspace has no Slack installation. Call "
                        "slackcheckconnection first and share the install URL."
                    ),
                )
            if len(team_ids) > 1:
                return SlackListChannelsOutput(
                    success=False,
                    error=(
                        "Workspace has multiple Slack installations; pass "
                        "team_id explicitly. Available: "
                        + ", ".join(team_ids)
                    ),
                )
            team_id = team_ids[0]

        try:
            result = await workflow.step(
                function="slack_list_conversations",
                function_input={
                    "slack_team_id": team_id,
                    "workspace_id": workflow_input.workspace_id,
                    "include_private": workflow_input.include_private,
                    "limit": workflow_input.limit,
                },
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:  # noqa: BLE001
            log.error(
                "SlackListChannels: conversations.list failed",
                error=str(e),
            )
            return SlackListChannelsOutput(
                success=False,
                team_id=team_id,
                error=f"Failed to list channels: {e!s}",
            )

        ok, channels, error, private_unavailable = _channels_from(
            result
        )
        if not ok:
            return SlackListChannelsOutput(
                success=False,
                team_id=team_id,
                error=error or "conversations.list failed",
            )

        return SlackListChannelsOutput(
            success=True,
            team_id=team_id,
            channels=channels,
            private_channels_unavailable=private_unavailable,
        )
