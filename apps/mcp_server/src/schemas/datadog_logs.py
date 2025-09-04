# """Datadog Logs API Schema
# Source: https://docs.datadoghq.com/api/latest/logs/
# """

DATADOG_LOGS_SCHEMA = {
    "data": [
        {
            "id": "log_12345678901234567890",
            "type": "log",
            "attributes": {
                "timestamp": "2024-01-15T10:30:00.123Z",
                "service": "payment-service",
                "source": "kubernetes",
                "status": "error",
                "message": "Database connection timeout after 30 seconds",
                "host": "production-server-01",
                "tags": [
                    "env:production",
                    "service:payment",
                    "version:1.2.3",
                    "error:timeout",
                ],
                "attributes": {
                    "level": "ERROR",
                    "logger": "com.example.PaymentService",
                    "thread": "http-nio-8080-exec-1",
                    "error_kind": "DatabaseTimeoutException",
                    "error_message": "Connection timeout",
                    "stack_trace": "DatabaseTimeoutException: Connection timeout\n\tat com.example.db.ConnectionPool.getConnection(ConnectionPool.java:45)",
                    "user_id": "user_12345",
                    "request_id": "req_abcdef123456",
                },
            },
        },
        {
            "id": "log_98765432109876543210",
            "type": "log",
            "attributes": {
                "timestamp": "2024-01-15T10:29:45.567Z",
                "service": "payment-service",
                "source": "kubernetes",
                "status": "warn",
                "message": "Slow database query detected",
                "host": "production-server-02",
                "tags": [
                    "env:production",
                    "service:payment",
                    "version:1.2.3",
                    "performance:slow",
                ],
                "attributes": {
                    "level": "WARN",
                    "logger": "com.example.PaymentService",
                    "thread": "http-nio-8080-exec-2",
                    "query_duration_ms": 2500,
                    "query": "SELECT * FROM transactions WHERE...",
                    "user_id": "user_67890",
                    "request_id": "req_fedcba654321",
                },
            },
        },
    ],
    "meta": {
        "page": {
            "after": "eyJhZnRlciI6IkFRQUFBWE5wYmhOelJXeHNjMUJuZVM5U2FscUY"
        },
        "elapsed": 123,
        "request_id": "MWlFUjJVZWJBVFZ6ZUJDcEJ6b3JvQXxfanU0a0FJc0lhMjJOXy1BdGd2dnJR",
        "status": "done",
        "warnings": [],
    },
    "links": {
        "next": "https://api.datadoghq.com/api/v2/logs/events?filter[query]=service:payment-service&page[cursor]=eyJhZnRlciI6IkFRQUFBWE5wYmhOelJXeHNjMUJuZVM5U2FscUY"
    },
}
