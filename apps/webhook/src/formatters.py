"""Format webhook payloads into task descriptions."""
import json
import time
from typing import Any


def _extract_github_title(payload: dict[str, Any], headers: dict[str, str]) -> str | None:
    """Extract title from GitHub webhook."""
    event = headers.get("x-github-event", "").lower()

    if event == "pull_request" and "pull_request" in payload:
        pr = payload["pull_request"]
        action = payload.get("action", "")
        return f"GitHub PR {action}: {pr.get('title', 'Untitled')}"

    if event == "issues" and "issue" in payload:
        issue = payload["issue"]
        action = payload.get("action", "")
        return f"GitHub Issue {action}: {issue.get('title', 'Untitled')}"

    if event == "push" and "commits" in payload:
        branch = payload.get("ref", "").split("/")[-1]
        commit_count = len(payload["commits"])
        return f"GitHub Push: {commit_count} commit(s) to {branch}"

    return None


def _extract_service_title(payload: dict[str, Any], headers: dict[str, str]) -> str | None:
    """Extract title from various service webhooks."""
    # Linear
    if payload.get("type") == "Issue" and "data" in payload:
        return f"Linear Issue: {payload['data'].get('title', 'Untitled')}"

    # Zendesk
    if "ticket" in payload:
        return f"Zendesk: {payload['ticket'].get('subject', 'New ticket')}"

    # PagerDuty
    if "incident" in payload:
        return f"PagerDuty: {payload['incident'].get('title', 'New incident')}"

    # Datadog
    if "alert_type" in payload:
        return f"Datadog Alert: {payload.get('title', 'Alert')}"

    return None


def _extract_generic_title(payload: dict[str, Any]) -> str | None:
    """Try to extract a generic title from common fields."""
    for field in ["title", "subject", "name", "summary"]:
        if field in payload and payload[field]:
            return str(payload[field])

    return None


def format_webhook_payload_as_task_description(
    headers: dict[str, str],
    payload: dict[str, Any]
) -> tuple[str, str]:
    """Format webhook payload into task title and description."""
    title = "Webhook Event"

    if isinstance(payload, dict):
        # Try different title extraction strategies
        title = (
            _extract_github_title(payload, headers) or
            _extract_service_title(payload, headers) or
            _extract_generic_title(payload) or
            title
        )

    # Create detailed description with the full payload
    description = f"""**Webhook Event**

**Headers:**
```json
{json.dumps(dict(headers), indent=2)}
```

**Payload:**
```json
{json.dumps(payload, indent=2)}
```

**Received at:** {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}
"""

    return title, description
