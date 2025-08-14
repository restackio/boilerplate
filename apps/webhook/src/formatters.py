"""Webhook payload formatters for different services."""
import json
import time
from typing import Any


def format_webhook_payload_as_task_description(
    headers: dict[str, str],
    payload: dict[str, Any]
) -> tuple[str, str]:
    """Format webhook payload into task title and description."""
    # Try to generate a meaningful title from common webhook patterns
    title = "Webhook Event"

    # Check for common title patterns in payload
    if isinstance(payload, dict):
        # GitHub patterns
        if "pull_request" in payload:
            action = payload.get("action", "unknown")
            pr_number = payload.get("number", "unknown")
            title = f"GitHub PR #{pr_number} {action}"
        elif "commits" in payload and "ref" in payload:
            ref = payload.get("ref", "unknown").replace("refs/heads/", "")
            title = f"GitHub push to {ref}"
        elif headers.get("x-github-event"):
            event_type = headers.get("x-github-event")
            title = f"GitHub {event_type}"

        # Linear patterns
        elif payload.get("type") and "issue" in payload.get("type", ""):
            issue_data = payload.get("data", {})
            issue_title = issue_data.get("title", "Unknown Issue")
            title = f"Linear: {issue_title}"

        # Zendesk patterns
        elif "ticket" in payload:
            ticket_data = payload.get("ticket", {})
            ticket_id = ticket_data.get("id", "unknown")
            ticket_subject = ticket_data.get("subject", "Unknown Subject")
            title = f"Zendesk Ticket #{ticket_id}: {ticket_subject}"

        # Datadog patterns
        elif "alert" in payload or headers.get("user-agent", "").lower().startswith("datadog"):
            alert_title = payload.get("title", payload.get("alert_title", "Unknown Alert"))
            title = f"Datadog: {alert_title}"

        # PagerDuty patterns
        elif "incident" in payload:
            incident_data = payload.get("incident", {})
            incident_title = incident_data.get("title", "Unknown Incident")
            title = f"PagerDuty: {incident_title}"

        # Generic patterns - look for common title fields
        elif any(field in payload for field in ["title", "subject", "name", "summary"]):
            for field in ["title", "subject", "name", "summary"]:
                if payload.get(field):
                    title = f"Webhook: {payload[field]}"
                    break

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
