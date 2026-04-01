"""Auto-resolve agent from user message using a lightweight LLM call."""

import logging
import time
from typing import Any

import httpx

from ..config import config

logger = logging.getLogger(__name__)


def _extract_agents(result: Any) -> list[dict[str, Any]]:
    """Normalise the workflow result into a list of agent dicts."""
    agents_raw: list | None = None

    if isinstance(result, dict):
        agents_raw = result.get("agents")
    elif hasattr(result, "agents"):
        agents_raw = result.agents

    if not agents_raw:
        return []

    out: list[dict[str, Any]] = []
    for a in agents_raw:
        if isinstance(a, dict):
            out.append(
                {
                    "id": str(a.get("id", "")),
                    "name": a.get("name", ""),
                    "description": a.get("description", ""),
                }
            )
        else:
            out.append(
                {
                    "id": str(getattr(a, "id", "")),
                    "name": getattr(a, "name", ""),
                    "description": getattr(a, "description", ""),
                }
            )
    return out


async def fetch_available_agents(workspace_id: str) -> list[dict[str, Any]]:
    """Fetch available agents from the backend via Restack workflow."""
    from ..client import client as restack_client

    workflow_id = f"slack_agents_list_{workspace_id}_{int(time.time())}"

    try:
        run_id = await restack_client.schedule_workflow(
            workflow_name="AgentsReadWorkflow",
            workflow_id=workflow_id,
            workflow_input={
                "workspace_id": workspace_id,
                "published_only": True,
            },
            task_queue=config.RESTACK_TASK_QUEUE,
        )
        result = await restack_client.get_workflow_result(
            workflow_id=workflow_id,
            run_id=run_id,
        )
        agents = _extract_agents(result)
        logger.info("Fetched %d agents for workspace %s", len(agents), workspace_id)
        return agents
    except Exception as e:
        logger.warning("Failed to fetch agents from backend: %s", e)
    return []


async def resolve_agent(
    message: str,
    available_agents: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Pick the best agent for a message using a lightweight LLM call.

    Falls back to the first available agent if auto-resolution is disabled
    or fails.
    """
    if not available_agents:
        return None

    if not config.AUTO_RESOLVE_AGENT or not config.OPENAI_API_KEY:
        return available_agents[0]

    agent_descriptions = "\n".join(
        f"- {a['name']}: {a.get('description', 'No description')}"
        for a in available_agents
    )
    prompt = (
        "You are an agent router. Given the user message and the list of available agents, "
        "pick the single best agent. Reply with ONLY the agent name, nothing else.\n\n"
        f"Agents:\n{agent_descriptions}\n\n"
        f"User message: {message}\n\n"
        "Best agent:"
    )

    try:
        async with httpx.AsyncClient() as http:
            resp = await http.post(
                "https://api.openai.com/v1/chat/completions",
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 50,
                    "temperature": 0,
                },
                headers={
                    "Authorization": f"Bearer {config.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=5,
            )
            data = resp.json()
            chosen_name = data["choices"][0]["message"]["content"].strip()

            for agent in available_agents:
                if agent["name"].lower() == chosen_name.lower():
                    logger.info("Auto-resolved agent: %s", agent["name"])
                    return agent

            for agent in available_agents:
                if chosen_name.lower() in agent["name"].lower():
                    logger.info("Fuzzy-matched agent: %s", agent["name"])
                    return agent

    except Exception as e:
        logger.warning("Agent auto-resolution failed: %s", e)

    return available_agents[0]
