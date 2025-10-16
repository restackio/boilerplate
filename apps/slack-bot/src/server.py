"""Server entry point for the Slack bot."""
import logging
import sys


def start() -> None:
    """Start the Slack bot in production mode."""
    from .services import start as services_start
    
    logging.info("Starting Slack bot in production mode...")
    services_start()


def dev() -> None:
    """Start the Slack bot in development mode with hot-reloading."""
    from .services import dev_watch
    
    logging.info("Starting Slack bot in development mode with hot-reloading...")
    dev_watch()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "dev":
        dev()
    else:
        start()

