"""Centralized configuration for the Slack bot."""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SLACK_BOT_TOKEN: str | None = os.getenv("SLACK_BOT_TOKEN")
    SLACK_APP_TOKEN: str | None = os.getenv("SLACK_APP_TOKEN")
    SLACK_SIGNING_SECRET: str | None = os.getenv("SLACK_SIGNING_SECRET")

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
    def is_configured(cls) -> bool:
        return bool(
            cls.SLACK_BOT_TOKEN and cls.SLACK_APP_TOKEN and cls.SLACK_SIGNING_SECRET
        )

    @classmethod
    def task_url(cls, task_id: str) -> str:
        return f"{cls.FRONTEND_URL}/tasks/{task_id}"


config = Config()
