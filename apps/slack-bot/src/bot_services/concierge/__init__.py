"""Restack Slack concierge: LLM front-desk for unconnected channels and DMs."""

from .agent import ConciergeResult, run_concierge

__all__ = ["ConciergeResult", "run_concierge"]
