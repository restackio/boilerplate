"""Webhook payload formatters for different services."""

import json
import time
from typing import Any


def _extract_github_title(
    payload: dict[str, Any], headers: dict[str, str]
) -> str | None:
    """Extract GitHub-specific title."""
    if "pull_request" in payload:
        action = payload.get("action", "unknown")
        pr_number = payload.get("number", "unknown")
        return f"GitHub PR #{pr_number} {action}"
    if "commits" in payload and "ref" in payload:
        ref = payload.get("ref", "unknown").replace(
            "refs/heads/", ""
        )
        return f"GitHub push to {ref}"
    if headers.get("x-github-event"):
        event_type = headers.get("x-github-event")
        return f"GitHub {event_type}"
    return None


def _extract_service_title(
    payload: dict[str, Any], headers: dict[str, str]
) -> str | None:
    """Extract title from various service payloads."""
    # Linear patterns
    if payload.get("type") and "issue" in payload.get("type", ""):
        issue_data = payload.get("data", {})
        issue_title = issue_data.get("title", "Unknown Issue")
        return f"Linear: {issue_title}"

    # Zendesk patterns
    if "ticket" in payload:
        ticket_data = payload.get("ticket", {})
        ticket_id = ticket_data.get("id", "unknown")
        ticket_subject = ticket_data.get(
            "subject", "Unknown Subject"
        )
        return f"Zendesk Ticket #{ticket_id}: {ticket_subject}"

    # Datadog patterns
    if "alert" in payload or headers.get(
        "user-agent", ""
    ).lower().startswith("datadog"):
        alert_title = payload.get(
            "title", payload.get("alert_title", "Unknown Alert")
        )
        return f"Datadog: {alert_title}"

    # PagerDuty patterns
    if "incident" in payload:
        incident_data = payload.get("incident", {})
        incident_title = incident_data.get(
            "title", "Unknown Incident"
        )
        return f"PagerDuty: {incident_title}"

    return None


def _extract_generic_title(payload: dict[str, Any]) -> str | None:
    """Extract generic title from common fields."""
    for field in ["title", "subject", "name", "summary"]:
        if payload.get(field):
            return f"Webhook: {payload[field]}"
    return None


def format_webhook_payload_as_task_description(
    headers: dict[str, str], payload: dict[str, Any]
) -> tuple[str, str]:
    """Format webhook payload into task title and description."""
    title = "Webhook Event"

    if isinstance(payload, dict):
        # Try different title extraction strategies
        title = (
            _extract_github_title(payload, headers)
            or _extract_service_title(payload, headers)
            or _extract_generic_title(payload)
            or title
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

**Received at:** {time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())}
"""

    return title, description
