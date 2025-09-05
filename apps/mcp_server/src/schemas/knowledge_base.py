# """Knowledge Base Schema
# Internal documentation retrieval for L1 support assessment
# """

KNOWLEDGE_BASE_SEARCH_SCHEMA = {
    "results": [
        {
            "id": "doc_12345",
            "title": "API Authentication Methods",
            "content": "This document covers various authentication methods supported by our API...",
            "category": "API Documentation",
            "tags": ["authentication", "api", "security"],
            "url": "https://docs.company.com/api/auth",
            "relevance_score": 0.95,
            "last_updated": "2024-01-15T10:30:00Z",
        },
        {
            "id": "doc_67890",
            "title": "Troubleshooting Common Issues",
            "content": "Common issues and their solutions for customer support...",
            "category": "Support Guide",
            "tags": [
                "troubleshooting",
                "support",
                "common-issues",
            ],
            "url": "https://docs.company.com/support/troubleshooting",
            "relevance_score": 0.87,
            "last_updated": "2024-01-10T14:20:00Z",
        },
    ],
    "total_results": 15,
    "query": "user authentication issues",
    "search_time_ms": 45,
}
