# """Linear Issue Creation API Schema
# Source: https://linear.app/developers/graphql#creating-and-editing-issues
# """

LINEAR_ISSUE_CREATION_SCHEMA = {
    "data": {
        "issueCreate": {
            "success": True,
            "issue": {
                "id": "issue_01234567890123456789",
                "identifier": "ENG-123",
                "title": "Database timeout issue affecting payment service",
                "description": "Investigation needed for recurring database timeout errors in the payment service. This is affecting user transactions and needs immediate attention.",
                "priority": 1,
                "estimate": 5,
                "state": {
                    "id": "state_12345",
                    "name": "Todo",
                    "type": "backlog",
                },
                "team": {
                    "id": "team_67890",
                    "name": "Engineering",
                    "key": "ENG",
                },
                "assignee": {
                    "id": "user_11111",
                    "name": "Jane Smith",
                    "email": "jane.smith@company.com",
                },
                "creator": {
                    "id": "user_22222",
                    "name": "Support Bot",
                    "email": "support-bot@company.com",
                },
                "labels": [
                    {
                        "id": "label_1",
                        "name": "bug",
                        "color": "#ff4444",
                    },
                    {
                        "id": "label_2",
                        "name": "critical",
                        "color": "#ff0000",
                    },
                    {
                        "id": "label_3",
                        "name": "database",
                        "color": "#0066cc",
                    },
                ],
                "project": {
                    "id": "project_33333",
                    "name": "Q1 Infrastructure Improvements",
                },
                "url": "https://linear.app/company/issue/ENG-123",
                "createdAt": "2024-01-15T10:30:00.000Z",
                "updatedAt": "2024-01-15T10:30:00.000Z",
                "dueDate": "2024-01-22T23:59:59.000Z",
            },
        }
    }
}
