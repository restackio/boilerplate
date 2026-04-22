"""In-memory per-user rate limiter for the concierge.

Uses a sliding-window counter: at most ``MAX_REQUESTS`` concierge calls
per ``WINDOW_SECONDS`` per Slack user. Rejected calls return ``False``
and the caller should respond with a friendly rate-limit message.

For a production multi-instance deployment this should move to Redis,
but a single-process in-memory dict is sufficient while the slack-bot
runs as one instance.
"""

from __future__ import annotations

import time
from collections import deque
from threading import Lock

MAX_REQUESTS = 20
WINDOW_SECONDS = 3600

_buckets: dict[str, deque[float]] = {}
_lock = Lock()


def check_and_record(user_id: str) -> bool:
    """Return True if the user is under the limit; record the call.

    Returns False if the user has exceeded ``MAX_REQUESTS`` in the last
    ``WINDOW_SECONDS`` seconds. The offending call is not recorded.
    """
    now = time.time()
    cutoff = now - WINDOW_SECONDS

    with _lock:
        bucket = _buckets.setdefault(user_id, deque())

        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= MAX_REQUESTS:
            return False

        bucket.append(now)
        return True


def reset(user_id: str) -> None:
    """Clear the rate-limit bucket for a user (useful in tests)."""
    with _lock:
        _buckets.pop(user_id, None)
