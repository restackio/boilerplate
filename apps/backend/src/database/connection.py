import logging
import os
from collections.abc import AsyncGenerator

import clickhouse_connect
from dotenv import load_dotenv
from sqlalchemy.exc import DisconnectionError
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .models import Base

# Create logger for this module
logger = logging.getLogger(__name__)

# Only load .env file if we're not in Docker (no NODE_ENV=production)
if os.getenv("NODE_ENV") != "production":
    load_dotenv()

# Database URL from environment - convert to async format
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/boilerplate_postgres",
)
# Convert to async URL if it's not already
if DATABASE_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://", 1
    )
elif DATABASE_URL.startswith("postgresql+psycopg2://"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace(
        "postgresql+psycopg2://", "postgresql+asyncpg://", 1
    )
else:
    ASYNC_DATABASE_URL = DATABASE_URL

# Create async engine with built-in resilience features
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # Validate connections before use
    pool_recycle=3600,  # Recycle connections after 1 hour
    pool_timeout=30,  # Timeout for getting connection from pool
    pool_reset_on_return="commit",  # Reset connections when returned to pool
    pool_size=20,
    max_overflow=10,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session."""
    session = AsyncSessionLocal()
    try:
        yield session
    finally:
        await session.close()


async def init_async_db() -> None:
    """Initialize database tables using SQLAlchemy's built-in resilience features."""
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully")
    except DisconnectionError as e:
        logger.warning("Database connection failed: %s", e)
        logger.info(
            "SQLAlchemy will handle reconnection automatically via pool_pre_ping"
        )
        raise
    except Exception:
        logger.exception("Database initialization failed")
        raise


async def close_async_db() -> None:
    """Close database connections (async version)."""
    await async_engine.dispose()


def get_clickhouse_client() -> clickhouse_connect.driver.Client:
    """Get ClickHouse client connection (synchronous - use for compatibility only)."""
    return clickhouse_connect.get_client(
        host=os.getenv("CLICKHOUSE_HOST", "localhost"),
        port=int(os.getenv("CLICKHOUSE_PORT", "8123")),
        username=os.getenv("CLICKHOUSE_USER", "clickhouse"),
        password=os.getenv("CLICKHOUSE_PASSWORD", "clickhouse"),
        database=os.getenv(
            "CLICKHOUSE_DATABASE", "boilerplate_clickhouse"
        ),
    )


async def get_clickhouse_async_client() -> (
    clickhouse_connect.driver.AsyncClient
):
    """Get async ClickHouse client connection."""
    return await clickhouse_connect.get_async_client(
        host=os.getenv("CLICKHOUSE_HOST", "localhost"),
        port=int(os.getenv("CLICKHOUSE_PORT", "8123")),
        username=os.getenv("CLICKHOUSE_USER", "clickhouse"),
        password=os.getenv("CLICKHOUSE_PASSWORD", "clickhouse"),
        database=os.getenv(
            "CLICKHOUSE_DATABASE", "boilerplate_clickhouse"
        ),
    )
