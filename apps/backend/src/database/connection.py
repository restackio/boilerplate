import logging
import os
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.exc import DisconnectionError
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .models import Base

# Only load .env file if we're not in Docker (no NODE_ENV=production)
if os.getenv("NODE_ENV") != "production":
    load_dotenv()

# Database URL from environment - convert to async format
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/boilerplate_db",
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
        logging.info("Database initialized successfully")
    except DisconnectionError as e:
        logging.warning("Database connection failed: %s", e)
        logging.info(
            "SQLAlchemy will handle reconnection automatically via pool_pre_ping"
        )
        raise
    except Exception:
        logging.exception("Database initialization failed")
        raise


async def close_async_db() -> None:
    """Close database connections (async version)."""
    await async_engine.dispose()
