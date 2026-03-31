"""Restack client for scheduling workflows from the Slack bot."""

from restack_ai import Restack
from restack_ai.restack import CloudConnectionOptions

from .config import config

connection_options = CloudConnectionOptions(
    engine_id=config.RESTACK_ENGINE_ID,
    address=config.RESTACK_ENGINE_ADDRESS,
    api_key=config.RESTACK_ENGINE_API_KEY,
)
client = Restack(connection_options)
