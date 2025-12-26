from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

# Database URL - using environment variable or default to local postgres
DATABASE_URL = os.getenv("DATABASE_URL")
assert DATABASE_URL, "DATABASE_URL is not set"

# Create engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
