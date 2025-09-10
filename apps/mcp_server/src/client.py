import os

from dotenv import load_dotenv
from restack_ai import Restack
from restack_ai.restack import CloudConnectionOptions

if os.getenv("NODE_ENV") != "production":
    load_dotenv()

engine_id = os.getenv("RESTACK_ENGINE_ID")
address = os.getenv("RESTACK_ENGINE_ADDRESS")
api_key = os.getenv("RESTACK_ENGINE_API_KEY")
api_address = os.getenv("RESTACK_ENGINE_API_ADDRESS")
stream_address = os.getenv("RESTACK_ENGINE_STREAM_ADDRESS")

connection_options = CloudConnectionOptions(
    engine_id=engine_id,
    address=address,
    api_key=api_key,
    api_address=api_address,
)
client = Restack(connection_options)
