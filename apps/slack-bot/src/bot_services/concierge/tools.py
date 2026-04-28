"""Tools the concierge LLM can invoke.

Each tool is:

* Defined as an OpenAI-compatible JSON schema in ``TOOL_SCHEMAS``.
* Implemented as an async Python function.
* Dispatched via ``dispatch_tool_call(name, arguments, context)``.

The ``context`` dict carries per-request information the tools need but
that the LLM must NOT control (workspace_id, channel_integration_id, the
Slack channel the user is currently in, etc.). This prevents the LLM from
configuring a channel it's not in, or impersonating another workspace.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from ...config import config
from ..agent_resolver import fetch_available_agents
from ..task_manager import create_task_from_slack

logger = logging.getLogger(__name__)

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "list_agents",
            "description": (
                "List all published agents in the user's Restack workspace. "
                "Call this when the user asks what agents they have, or when "
                "you need to pick one to route a message to."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_channel_mappings",
            "description": (
                "List which Slack channels in this workspace are mapped to "
                "which agents. Useful when the user asks 'what's set up where'."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "configure_channel_agent",
            "description": (
                "Map the current Slack channel to a specific agent. After "
                "this, all @mentions in this channel will be routed to that "
                "agent automatically. Use this when the user has picked an "
                "agent for the channel they're messaging from."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_id": {
                        "type": "string",
                        "description": (
                            "The id of the agent to map. Must come from a "
                            "prior list_agents() call."
                        ),
                    },
                },
                "required": ["agent_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "hand_off_to_agent",
            "description": (
                "Create a task for a specific agent with a message. Use this "
                "when the user wants real work done and you've picked an "
                "appropriate agent. The agent will reply in the thread."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_id": {
                        "type": "string",
                        "description": "The id of the agent to hand off to.",
                    },
                    "message": {
                        "type": "string",
                        "description": (
                            "The message / task description to send to the "
                            "agent. Usually the user's original request."
                        ),
                    },
                },
                "required": ["agent_id", "message"],
            },
        },
    },
]


async def _tool_list_agents(context: dict[str, Any]) -> dict[str, Any]:
    workspace_id = context.get("workspace_id")
    if not workspace_id:
        return {"error": "No workspace configured for this Slack install."}

    agents = await fetch_available_agents(workspace_id)
    if not agents:
        return {
            "agents": [],
            "note": (
                "This workspace has no published agents yet. The user must "
                "create one in the Restack dashboard."
            ),
        }
    return {
        "agents": [
            {
                "id": a["id"],
                "name": a["name"],
                "description": a.get("description") or "",
            }
            for a in agents
        ]
    }


async def _tool_list_channel_mappings(context: dict[str, Any]) -> dict[str, Any]:
    channel_integration_id = context.get("channel_integration_id")
    if not channel_integration_id:
        return {"mappings": [], "note": "No Slack installation linked."}

    from ...client import client as restack_client

    wf_id = f"slack_concierge_list_mappings_{uuid.uuid4().hex[:10]}"
    try:
        run_id = await restack_client.schedule_workflow(
            workflow_name="ChannelsByIntegrationWorkflow",
            workflow_id=wf_id,
            workflow_input={
                "channel_integration_id": channel_integration_id,
            },
            task_queue=config.RESTACK_TASK_QUEUE,
        )
        result = await restack_client.get_workflow_result(
            workflow_id=wf_id, run_id=run_id
        )
    except Exception as e:
        logger.warning("list_channel_mappings failed: %s", e)
        return {"error": f"Could not fetch mappings: {e}"}

    mappings_raw: list[Any] = []
    if isinstance(result, dict):
        mappings_raw = result.get("channels") or []
    elif hasattr(result, "channels"):
        mappings_raw = result.channels or []

    # Channel display names are intentionally not stored — the LLM only
    # needs the (channel_id → agent_id) mapping to answer "what's set up
    # where". Slack's renderer turns C-prefixed IDs into clickable
    # #channel-name links automatically.
    mappings: list[dict[str, Any]] = []
    for m in mappings_raw:
        if isinstance(m, dict):
            mappings.append(
                {
                    "channel_id": m.get("external_channel_id", ""),
                    "agent_id": m.get("agent_id", ""),
                }
            )
        else:
            mappings.append(
                {
                    "channel_id": getattr(m, "external_channel_id", ""),
                    "agent_id": str(getattr(m, "agent_id", "")),
                }
            )
    return {"mappings": mappings}


async def _tool_configure_channel_agent(
    args: dict[str, Any], context: dict[str, Any]
) -> dict[str, Any]:
    agent_id = args.get("agent_id", "").strip()
    if not agent_id:
        return {"error": "agent_id is required."}

    channel_integration_id = context.get("channel_integration_id")
    channel_id = context.get("channel_id")

    if not channel_integration_id:
        return {
            "error": (
                "No Slack installation linked — cannot persist mapping. "
                "User should reinstall the Slack app from the dashboard."
            )
        }
    if not channel_id:
        return {"error": "No channel context available."}
    if channel_id.startswith("D"):
        return {
            "error": (
                "This is a DM, not a channel. Channel-agent mappings only "
                "apply to real channels."
            )
        }

    from ...client import client as restack_client

    wf_id = f"slack_concierge_cfg_{channel_id}_{uuid.uuid4().hex[:8]}"
    try:
        run_id = await restack_client.schedule_workflow(
            workflow_name="ChannelCreateWorkflow",
            workflow_id=wf_id,
            workflow_input={
                "channel_integration_id": channel_integration_id,
                "external_channel_id": channel_id,
                "agent_id": agent_id,
            },
            task_queue=config.RESTACK_TASK_QUEUE,
        )
        await restack_client.get_workflow_result(workflow_id=wf_id, run_id=run_id)
    except Exception as e:
        logger.exception("configure_channel_agent failed")
        return {"error": f"Failed to persist mapping: {e}"}

    return {
        "ok": True,
        "channel_id": channel_id,
        "agent_id": agent_id,
    }


async def _tool_hand_off_to_agent(
    args: dict[str, Any], context: dict[str, Any]
) -> dict[str, Any]:
    agent_id = args.get("agent_id", "").strip()
    message = args.get("message", "").strip()
    if not agent_id or not message:
        return {"error": "Both agent_id and message are required."}

    workspace_id = context.get("workspace_id")
    if not workspace_id:
        return {"error": "No workspace configured."}

    agents = await fetch_available_agents(workspace_id)
    agent = next((a for a in agents if a["id"] == agent_id), None)
    if not agent:
        return {
            "error": (
                f"Agent id {agent_id} not found in this workspace. Call "
                "list_agents() to get valid ids."
            )
        }

    channel_id = context.get("channel_id", "")
    thread_ts = context.get("thread_ts", "")
    slack_user_id = context.get("slack_user_id", "")
    user_name = context.get("user_name", "Unknown")
    team_id = context.get("team_id") or ""
    channel_name = context.get("channel_name") or None

    title = message[:80] if len(message) > 80 else message
    description = (
        f"Message from {user_name} in Slack:\n\n{message}"
    )

    result = await create_task_from_slack(
        workspace_id=workspace_id,
        agent_id=agent_id,
        agent_name=agent["name"],
        title=title,
        description=description,
        slack_channel=channel_id,
        slack_thread_ts=thread_ts,
        slack_user_id=slack_user_id,
        slack_team_id=team_id or None,
        slack_channel_name=channel_name,
    )
    if not result:
        return {"error": "Failed to create task."}

    return {
        "ok": True,
        "agent_name": agent["name"],
        "agent_id": agent_id,
    }


async def dispatch_tool_call(
    name: str,
    arguments_json: str,
    context: dict[str, Any],
) -> str:
    """Run the named tool and return its result as a JSON string for the LLM."""
    try:
        args = json.loads(arguments_json) if arguments_json else {}
    except json.JSONDecodeError:
        return json.dumps({"error": f"invalid json arguments: {arguments_json!r}"})

    try:
        if name == "list_agents":
            result = await _tool_list_agents(context)
        elif name == "list_channel_mappings":
            result = await _tool_list_channel_mappings(context)
        elif name == "configure_channel_agent":
            result = await _tool_configure_channel_agent(args, context)
        elif name == "hand_off_to_agent":
            result = await _tool_hand_off_to_agent(args, context)
        else:
            result = {"error": f"unknown tool: {name}"}
    except Exception as e:
        logger.exception("Concierge tool %s failed", name)
        result = {"error": f"tool {name} raised: {e}"}

    return json.dumps(result)
