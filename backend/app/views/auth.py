from fastapi import APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import jwt
import os
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.auth import verify_password, create_user
from app.utils.database import get_db
from app.utils.utils import timer
from app.models.database import User

auth_router = APIRouter(prefix="/auth")
security = HTTPBearer(auto_error=False)  # Don't auto-raise error, we'll handle it

# JWT secret key (in production, use environment variable)
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
assert JWT_SECRET_KEY, "JWT_SECRET_KEY is not set"
JWT_ALGORITHM = "HS256"


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    email: str
    expires_in: int  # seconds


def get_token_from_request(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[str]:
    """
    Get token from either Authorization header or cookie.
    Returns None if no valid token is found.
    """
    # Try to get from Authorization header first
    if credentials:
        return credentials.credentials

    # Try to get from cookie
    token = request.cookies.get("session_token")
    return token


def create_jwt_token(email: str) -> str:
    """
    Create a JWT token with email and expiration.
    """
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(hours=24)
    # JWT expects timestamps (seconds since epoch) for exp and iat
    payload = {
        "email": email,
        "exp": int(expiration.timestamp()),
        "iat": int(now.timestamp()),
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token


def verify_token(token: Optional[str]) -> dict:
    """
    Verify JWT token and return decoded payload.
    Raises HTTPException if token is invalid or expired.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@auth_router.post("/login")
@timer
async def login(
    request: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user and create JWT token.
    """
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    if not await verify_password(request.email, request.password, db):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create JWT token (stateless - no backend storage needed)
    token = create_jwt_token(request.email)

    # Set HTTP-only cookie using max_age (simpler, no timezone issues)
    # 86400 seconds = 24 hours
    response.set_cookie(
        key="session_token",
        value=token,
        max_age=86400,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )

    return LoginResponse(
        token=token,
        email=request.email,
        expires_in=86400,
    )


@auth_router.post("/register")
@timer
async def register(
    request: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)
):
    """
    Register a new user and create JWT token.
    """
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    if len(request.password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters"
        )

    try:
        # Create user in database
        user = await create_user(
            email=request.email,
            password=request.password,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create user")

    # Create JWT token and set cookie (same as login)
    token = create_jwt_token(user.email)

    response.set_cookie(
        key="session_token",
        value=token,
        max_age=86400,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )

    return LoginResponse(
        token=token,
        email=user.email,
        expires_in=86400,
    )


@auth_router.post("/logout")
@timer
async def logout(
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Logout user by clearing cookie.
    With JWT tokens, we just delete the cookie - the token itself becomes invalid
    when it expires. For immediate invalidation, you'd need a token blacklist.
    """
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}


@auth_router.get("/me")
async def get_current_user_endpoint(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Get current authenticated user info from JWT token.
    """
    token = get_token_from_request(request, credentials)
    payload = verify_token(token)

    return {"email": payload["email"]}


def get_current_email(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """
    Dependency function to get current email from JWT token.
    Use this in other endpoints that require authentication.
    Supports both Authorization header and cookie-based auth.
    """
    token = get_token_from_request(request, credentials)
    payload = verify_token(token)
    return payload["email"]


async def get_current_user_obj(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency function to get current User object from JWT token.
    Use this in other endpoints that require the full User object.
    Supports both Authorization header and cookie-based auth.
    """
    from sqlalchemy import select

    token = get_token_from_request(request, credentials)
    payload = verify_token(token)
    email = payload["email"]

    # Get user from database using async query
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
