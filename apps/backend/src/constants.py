"""Backend constants.

Centralized constants for the backend service.
"""

# Task queue for Restack workflow routing.
# This must match across:
# - services.py (start_service)
# - All workflow files (workflow.step calls)
# - Frontend (workflow.ts)
# - Webhook (app.py)
# - Schedule functions
TASK_QUEUE = "backend"

