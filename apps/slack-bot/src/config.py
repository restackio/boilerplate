"""Centralized configuration for the Slack bot."""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SLACK_BOT_TOKEN: str | None = os.getenv("SLACK_BOT_TOKEN")
    SLACK_APP_TOKEN: str | None = os.getenv("SLACK_APP_TOKEN")
    SLACK_SIGNING_SECRET: str | None = os.getenv("SLACK_SIGNING_SECRET")

    # "socket" = direct WebSocket to Slack (default, needs APP_TOKEN)
    # "http"   = receives forwarded events from the central router
    SLACK_EVENT_MODE: str = os.getenv("SLACK_EVENT_MODE", "socket")
    SLACK_CLIENT_ID: str | None = os.getenv("SLACK_CLIENT_ID")
    SLACK_CLIENT_SECRET: str | None = os.getenv("SLACK_CLIENT_SECRET")
    SLACK_HTTP_BASE_URL: str = os.getenv("SLACK_HTTP_BASE_URL", "http://localhost:3002")
    SLACK_ROUTER_API_KEY: str | None = os.getenv("SLACK_ROUTER_API_KEY")
    HTTP_PORT: int = int(os.getenv("SLACK_HTTP_PORT", "3002"))

    DEFAULT_WORKSPACE_ID: str | None = os.getenv("DEFAULT_WORKSPACE_ID")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    RESTACK_ENGINE_ID: str | None = os.getenv("RESTACK_ENGINE_ID")
    RESTACK_ENGINE_ADDRESS: str | None = os.getenv("RESTACK_ENGINE_ADDRESS")
    RESTACK_ENGINE_API_KEY: str | None = os.getenv("RESTACK_ENGINE_API_KEY")

    RESTACK_TASK_QUEUE: str = os.getenv("RESTACK_TASK_QUEUE", "backend")

    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    AUTO_RESOLVE_AGENT: bool = (
        os.getenv("SLACK_AUTO_RESOLVE_AGENT", "true").lower() == "true"
    )

    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def is_socket_mode(cls) -> bool:
        return cls.SLACK_EVENT_MODE.lower() != "http"

    @classmethod
    def is_configured(cls) -> bool:
        if cls.is_socket_mode():
            return bool(
                cls.SLACK_BOT_TOKEN
                and cls.SLACK_APP_TOKEN
                and cls.SLACK_SIGNING_SECRET
            )
        return bool(cls.SLACK_ROUTER_API_KEY or cls.SLACK_CLIENT_ID)

    @classmethod
    def task_url(cls, task_id: str) -> str:
        return f"{cls.FRONTEND_URL}/tasks/{task_id}"


config = Config()
