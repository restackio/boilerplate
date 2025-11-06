import os

from openai import AsyncOpenAI

# Singleton OpenAI client to prevent file descriptor leaks
_openai_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create the singleton AsyncOpenAI client.

    This prevents file descriptor leaks by reusing the same client
    across all function calls instead of creating a new one each time.

    Returns:
        AsyncOpenAI: The singleton OpenAI client instance.

    Raises:
        ValueError: If OPENAI_API_KEY environment variable is not set.
    """
    global _openai_client  # noqa: PLW0603
    if _openai_client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            msg = "OPENAI_API_KEY is not set"
            raise ValueError(msg)
        _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client
