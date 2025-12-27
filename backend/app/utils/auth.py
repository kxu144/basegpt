import hashlib
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import User


def hash_password(password: str) -> str:
    """Hash a password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()


async def verify_password(email: str, password: str, db: AsyncSession) -> bool:
    """Verify a password against the stored hash."""
    password_hash = hash_password(password)

    # Query user from database
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        return user.password_hash == password_hash
    return False


async def create_user(email: str, password: str, db: AsyncSession) -> User:
    """Create a new user in the database."""
    # Check if email already exists
    result = await db.execute(select(User).filter(User.email == email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise ValueError("Email already exists")

    # Create new user
    user = User(
        email=email,
        password_hash=hash_password(password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
