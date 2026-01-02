import hashlib
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import User


def hash_password(password: str, salt: str = "") -> str:
    """Hash a password using SHA256."""
    return hashlib.sha256((password + salt).encode()).hexdigest()


async def verify_password(email: str, password: str, db: AsyncSession) -> bool:
    """Verify a password against the stored hash."""
    # Query user from database
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        password_hash = hash_password(password, user.salt)
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
    salt = str(uuid.uuid4())
    password_hash = hash_password(password, salt)
    user = User(
        email=email,
        password_hash=hash_password(password, salt),
        salt=salt,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
