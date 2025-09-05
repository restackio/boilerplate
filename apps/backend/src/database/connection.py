import os
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
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
print(f"Database URL: {DATABASE_URL}")  # Debug print
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

# Create async engine with essential optimizations
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
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
    """Initialize database tables (async version)."""
    import asyncio
    
    # Retry database connection up to 5 times with exponential backoff
    for attempt in range(5):
        try:
            async with async_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("Database initialized successfully")
            return
        except Exception as e:
            wait_time = 2 ** attempt  # Exponential backoff: 1, 2, 4, 8, 16 seconds
            print(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt < 4:  # Don't wait after the last attempt
                print(f"Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)
            else:
                print("All database connection attempts failed")
                raise


async def close_async_db() -> None:
    """Close database connections (async version)."""
    await async_engine.dispose()
