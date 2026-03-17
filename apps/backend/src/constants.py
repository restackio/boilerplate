"""Backend constants.

Centralized constants for the backend service.
"""

TASK_QUEUE = "backend"

"""Task queue for the main backend worker."""

TASK_QUEUE_EMBED = "backend-embed"
"""Task queue for the embed worker (AddFilesToDataset + embed functions; rate limit 1)."""
