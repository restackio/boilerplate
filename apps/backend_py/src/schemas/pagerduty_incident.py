# """PagerDuty Incident API Schema
# Source: https://developer.pagerduty.com/api-reference/76f403c3fec76-get-an-incident-type
# """

PAGERDUTY_INCIDENT_SCHEMA = {
    "incident": {
        "id": "PINCIDENTID",
        "type": "incident",
        "summary": "Database connection timeout issues",
        "self": "https://api.pagerduty.com/incidents/PINCIDENTID",
        "html_url": "https://myaccount.pagerduty.com/incidents/PINCIDENTID",
        "incident_number": 123456,
        "title": "Database connection timeout issues",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T11:45:00Z",
        "status": "acknowledged",
        "incident_key": "incident_key_example",
        "service": {
            "id": "PSERVICE123",
            "type": "service_reference",
            "summary": "Production Database",
            "self": "https://api.pagerduty.com/services/PSERVICE123",
            "html_url": "https://myaccount.pagerduty.com/services/PSERVICE123"
        },
        "assignees": [
            {
                "id": "PUSER456",
                "type": "user_reference",
                "summary": "Jane Doe",
                "self": "https://api.pagerduty.com/users/PUSER456",
                "html_url": "https://myaccount.pagerduty.com/users/PUSER456"
            }
        ],
        "escalation_policy": {
            "id": "PEPOLICY789",
            "type": "escalation_policy_reference",
            "summary": "Database Team Policy",
            "self": "https://api.pagerduty.com/escalation_policies/PEPOLICY789",
            "html_url": "https://myaccount.pagerduty.com/escalation_policies/PEPOLICY789"
        },
        "teams": [
            {
                "id": "PTEAM101",
                "type": "team_reference",
                "summary": "Database Team",
                "self": "https://api.pagerduty.com/teams/PTEAM101",
                "html_url": "https://myaccount.pagerduty.com/teams/PTEAM101"
            }
        ],
        "priority": {
            "id": "PPRIORITY1",
            "type": "priority_reference",
            "summary": "P1 - Critical",
            "self": "https://api.pagerduty.com/priorities/PPRIORITY1",
            "html_url": "https://myaccount.pagerduty.com/priorities/PPRIORITY1"
        },
        "urgency": "high",
        "conference_bridge": {
            "conference_number": "+1-415-555-1212,,,,1234#",
            "conference_url": "https://meet.example.com/incident-123456"
        },
        "resolve_reason": None
    }
}
