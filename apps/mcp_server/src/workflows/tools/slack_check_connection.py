"""MCP tool: check whether a workspace has a Slack installation.

If the workspace has no installation yet, the tool also asks slack-bot for
an OAuth install URL that the build agent can share back to the user.
"""

from datetime import timedelta
from typing import Any

from pydantic import BaseModel, Field
from restack_ai.workflow import log, workflow


class SlackCheckConnectionInput(BaseModel):
    """Input for checking Slack connection status."""

    workspace_id: str = Field(
        ...,
        description="Workspace id (from meta_info.workspace_id).",
    )


class SlackInstallationSummary(BaseModel):
    team_id: str = Field(..., description="Slack team id (e.g. T01234ABC).")


class SlackCheckConnectionOutput(BaseModel):
    """Result of a Slack-connection probe."""

    success: bool = Field(
        ..., description="True if the lookup itself completed."
    )
    connected: bool = Field(
        ...,
        description="True when the workspace has at least one Slack installation.",
    )
    installations: list[SlackInstallationSummary] = Field(
        default_factory=list,
        description="Installations for this workspace (empty when not connected).",
    )
    install_url: str | None = Field(
        default=None,
        description=(
            "OAuth install URL to share with the user when connected=false. "
            "The user clicks it, completes Slack OAuth in a new tab, then "
            "says they're done — call this tool again to re-check."
        ),
    )
    error: str | None = Field(
        default=None, description="Error message if the lookup failed."
    )


def _extract_installations(result: Any) -> list[SlackInstallationSummary]:
    """Normalize ``channel_integrations_by_workspace`` output into Slack summaries.

    The backend may deserialize the workflow.step result as either a
    pydantic-shaped object (attribute access) or a plain dict depending on
    transport. Handle both shapes defensively.
    """
    raw: Any
    if isinstance(result, dict):
        raw = result.get("integrations") or []
    else:
        raw = getattr(result, "integrations", None) or []

    summaries: list[SlackInstallationSummary] = []
    for item in raw:
        if isinstance(item, dict):
            external_id = item.get("external_id") or ""
        else:
            external_id = getattr(item, "external_id", "") or ""
        if external_id:
            summaries.append(SlackInstallationSummary(team_id=external_id))
    return summaries


@workflow.defn(
    mcp=True,
    name="SlackCheckConnection",
    description=(
        "Check whether the user's workspace has Slack connected. Call this "
        "before slacklistchannels / slackbindchannel. When connected=false, "
        "share the returned install_url with the user and ask them to reply "
        "once they've completed OAuth; then call this tool again to verify."
    ),
)
class SlackCheckConnection:
    """Backend-backed check for Slack workspace installation status."""

    @workflow.run
    async def run(
        self, workflow_input: SlackCheckConnectionInput
    ) -> SlackCheckConnectionOutput:
        log.info(
            "SlackCheckConnection started",
            workspace_id=workflow_input.workspace_id,
        )
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
                "SlackCheckConnection: installations lookup failed",
                error=str(e),
            )
            return SlackCheckConnectionOutput(
                success=False,
                connected=False,
                error=f"Failed to list Slack installations: {e!s}",
            )

        installations = _extract_installations(list_result)

        if installations:
            return SlackCheckConnectionOutput(
                success=True,
                connected=True,
                installations=installations,
            )

        # Not connected — build an install URL for the user to click.
        try:
            url_result = await workflow.step(
                function="slack_build_install_url",
                function_input={"workspace_id": workflow_input.workspace_id},
                task_queue="backend",
                start_to_close_timeout=timedelta(seconds=10),
            )
        except Exception as e:  # noqa: BLE001
            log.error(
                "SlackCheckConnection: install-url lookup failed",
                error=str(e),
            )
            return SlackCheckConnectionOutput(
                success=True,
                connected=False,
                error=f"Failed to build Slack install URL: {e!s}",
            )

        if isinstance(url_result, dict):
            ok = bool(url_result.get("ok"))
            install_url = url_result.get("install_url")
            error = url_result.get("error")
        else:
            ok = bool(getattr(url_result, "ok", False))
            install_url = getattr(url_result, "install_url", None)
            error = getattr(url_result, "error", None)

        if not ok or not install_url:
            return SlackCheckConnectionOutput(
                success=True,
                connected=False,
                error=error or "slack-bot did not return an install URL",
            )

        return SlackCheckConnectionOutput(
            success=True,
            connected=False,
            install_url=install_url,
        )
