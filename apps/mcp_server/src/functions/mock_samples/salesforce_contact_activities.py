"""Salesforce Contact Activities Sample (AgentDealer / Office Technology CRM).

Mock data for one particular contact's activities: tasks, events, and recent history.
Aligns with https://www.agentdealer.com/industry-features (quotes, account reviews, territory).
"""

SALESFORCE_CONTACT_ACTIVITIES_SAMPLE = {
    "contact_id": "003xx000001234AAAQ",
    "contact_name": "Sarah Chen",
    "account_name": "Acme Office Solutions",
    "activities": [
        {
            "Id": "00Txx000001AbcDEF",
            "Subject": "Quote follow-up - MPS proposal",
            "ActivityType": "Task",
            "Status": "Completed",
            "Priority": "Normal",
            "ActivityDate": "2024-11-18",
            "Description": "Sent QuoteBuilder proposal for 45 devices, 3-year M&S.",
            "CreatedDate": "2024-11-15T09:00:00.000+0000",
            "OwnerId": "005xx000001AbcDEF",
        },
        {
            "Id": "00Txx000001AbcDEG",
            "Subject": "Account review scheduled",
            "ActivityType": "Event",
            "StartDateTime": "2024-11-25T14:00:00.000+0000",
            "EndDateTime": "2024-11-25T15:00:00.000+0000",
            "Description": "Quarterly account review - TCO and territory alignment.",
            "CreatedDate": "2024-11-10T11:30:00.000+0000",
        },
        {
            "Id": "00Txx000001AbcDEH",
            "Subject": "New opportunity - copier refresh",
            "ActivityType": "Task",
            "Status": "In Progress",
            "Priority": "High",
            "ActivityDate": "2024-11-22",
            "Description": "Discovery call completed; preparing quote for 12 devices.",
            "CreatedDate": "2024-11-20T16:45:00.000+0000",
            "OwnerId": "005xx000001AbcDEF",
        },
    ],
    "recent_notes": [
        {
            "Id": "002xx000001Note01",
            "Title": "Territory handoff",
            "Body": "Account moved into Central TX territory. Sarah prefers email for quotes.",
            "CreatedDate": "2024-11-01T08:00:00.000+0000",
        },
    ],
}
