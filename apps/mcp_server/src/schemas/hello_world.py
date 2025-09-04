"""Schema for hello world tool output."""

HELLO_WORLD_SCHEMA = {
    "type": "object",
    "properties": {
        "message": {
            "type": "string",
            "description": "Hello world greeting message"
        },
        "random_number": {
            "type": "integer",
            "description": "A randomly generated number between 1 and 1000"
        },
        "timestamp": {
            "type": "string",
            "description": "ISO timestamp when the response was generated"
        }
    },
    "required": ["message", "random_number", "timestamp"]
}
