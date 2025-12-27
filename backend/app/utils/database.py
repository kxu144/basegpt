from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
import os

# Database URL - using environment variable or default to local postgres
DATABASE_URL = os.getenv("DATABASE_URL")
assert DATABASE_URL, "DATABASE_URL is not set"

# Create engine
engine = create_async_engine(DATABASE_URL)

# Create session factory
SessionLocal = async_sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

# Base class for models
Base = declarative_base()


async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Dependency to get DB session
async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
