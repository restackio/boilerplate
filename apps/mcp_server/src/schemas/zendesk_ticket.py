# """Zendesk Ticket API Schema
# Source: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#show-ticket
# """

ZENDESK_TICKET_SCHEMA = {
    "ticket": {
        "assignee_id": 235323,
        "collaborator_ids": [35334, 234],
        "created_at": "2009-07-20T22:55:29Z",
        "custom_fields": [
            {"id": 27642, "value": "745"},
            {"id": 27648, "value": "yes"}
        ],
        "custom_status_id": 123,
        "description": "The fire is very colorful.",
        "due_at": None,
        "external_id": "ahg35h3jh",
        "follower_ids": [35334, 234],
        "from_messaging_channel": False,
        "generated_timestamp": 1304553600,
        "group_id": 98738,
        "has_incidents": False,
        "id": 35436,
        "organization_id": 509974,
        "priority": "high",
        "problem_id": 9873764,
        "raw_subject": "{{dc.printer_on_fire}}",
        "recipient": "support@company.com",
        "requester_id": 20978392,
        "satisfaction_rating": {
            "comment": "Great support!",
            "id": 1234,
            "score": "good"
        },
        "sharing_agreement_ids": [84432],
        "status": "open",
        "subject": "Help, my printer is on fire!",
        "submitter_id": 76872,
        "tags": ["enterprise", "other_tag"],
        "type": "incident",
        "updated_at": "2011-05-05T10:38:52Z",
        "url": "https://company.zendesk.com/api/v2/tickets/35436.json",
        "via": {"channel": "web"}
    }
}
