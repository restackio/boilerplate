import os

from openai import AsyncOpenAI

# Singleton OpenAI client to prevent file descriptor leaks
_openai_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI | None:
    """Get or create the singleton AsyncOpenAI client.

    This prevents file descriptor leaks by reusing the same client
    across all function calls. Returns None if OPENAI_API_KEY is not set
    (app can start without it; keys are typically per-workspace via Restack Cloud).
    """
    global _openai_client  # noqa: PLW0603
    if _openai_client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return None
        _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client
