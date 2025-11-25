"""Slack Bolt app configuration."""
import logging
import os
from dotenv import load_dotenv
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from slack_bolt.oauth.oauth_settings import OAuthSettings
from slack_sdk.oauth.installation_store import FileInstallationStore
from slack_sdk.oauth.state_store import FileOAuthStateStore

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Check if Slack credentials are configured
slack_configured = os.getenv("SLACK_SIGNING_SECRET") is not None

if not slack_configured:
    logger.warning("⚠️  Slack credentials not configured. Bot will not start.")
    logger.warning("   Set SLACK_SIGNING_SECRET and either:")
    logger.warning("   - SLACK_BOT_TOKEN (single workspace)")
    logger.warning("   - SLACK_CLIENT_ID + SLACK_CLIENT_SECRET (OAuth)")
    app = None
else:
    # Determine if we're using OAuth or single-workspace mode
    use_oauth = os.getenv("SLACK_CLIENT_ID") and os.getenv("SLACK_CLIENT_SECRET")

    if use_oauth:
        # Multi-workspace mode with OAuth
        logger.info("Initializing Bolt app with OAuth for multi-workspace support")
        
        oauth_settings = OAuthSettings(
            client_id=os.environ["SLACK_CLIENT_ID"],
            client_secret=os.environ["SLACK_CLIENT_SECRET"],
            scopes=[
                "app_mentions:read",
                "channels:history",
                "channels:read",
                "chat:write",
                "chat:write.public",
                "commands",
                "im:history",
                "im:read",
                "im:write",
                "reactions:write",
                "users:read",
            ],
            user_scopes=[],  # No user scopes needed for bot-only app
            installation_store=FileInstallationStore(base_dir="./data/installations"),
            state_store=FileOAuthStateStore(
                expiration_seconds=600,
                base_dir="./data/states"
            ),
            install_path="/slack/install",
            redirect_uri_path="/slack/oauth_redirect",
        )
        
        app = App(
            signing_secret=os.environ["SLACK_SIGNING_SECRET"],
            oauth_settings=oauth_settings,
        )
    else:
        # Single-workspace mode (development)
        logger.info("Initializing Bolt app in single-workspace mode")
        
        app = App(
            token=os.getenv("SLACK_BOT_TOKEN"),
            signing_secret=os.getenv("SLACK_SIGNING_SECRET"),
        )

# Import listeners only if app is configured
if app is not None:
    # Import order matters - do events first, then actions
    from .listeners import assistant, commands, events, actions  # noqa: E402, F401
    logger.info("Slack bot initialized successfully")
else:
    logger.info("Slack bot NOT initialized - missing credentials")


def start_socket_mode():
    """Start the app in Socket Mode."""
    if app is None:
        logger.error("Cannot start: Slack credentials not configured")
        logger.info("The bot will not run until you configure Slack credentials.")
        logger.info("See SLACK_SIMPLE_SETUP.md for setup instructions.")
        return
    
    app_token = os.getenv("SLACK_APP_TOKEN")
    if not app_token:
        logger.error("SLACK_APP_TOKEN not set - required for Socket Mode")
        return
    
    handler = SocketModeHandler(app, app_token)
    logger.info("⚡️ Slack bot is running in Socket Mode!")
    handler.start()


if __name__ == "__main__":
    start_socket_mode()
