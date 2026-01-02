from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.utils.database import get_db
from app.utils.auth import verify_password
from app.utils.encryption import (
    encrypt_password,
    decrypt_password,
    derive_key_from_password,
)
from app.models.database import UserKeys, User
from app.views.auth import get_token_from_request, verify_token, get_current_email

keys_router = APIRouter(prefix="/keys")
security = HTTPBearer(auto_error=False)

# In-memory storage for unlock sessions
# Stores: email -> (unlock_timestamp, derived_encryption_key)
# In production, consider using Redis or similar
unlock_sessions: Dict[str, tuple[datetime, bytes]] = {}
UNLOCK_DURATION = timedelta(minutes=5)


def is_unlocked(email: str) -> bool:
    """Check if user's keys are currently unlocked."""
    if email not in unlock_sessions:
        return False
    unlock_time, _ = unlock_sessions[email]
    if datetime.now() > unlock_time + UNLOCK_DURATION:
        # Session expired
        del unlock_sessions[email]
        return False
    return True


def get_encryption_key(email: str) -> Optional[bytes]:
    """Get the stored encryption key for a user if unlocked."""
    if not is_unlocked(email):
        return None
    _, encryption_key = unlock_sessions[email]
    return encryption_key


def unlock_user(email: str, user_password: str):
    """Unlock user's keys for 5 minutes and store derived encryption key."""
    encryption_key = derive_key_from_password(user_password)
    unlock_sessions[email] = (datetime.now(), encryption_key)


class UnlockRequest(BaseModel):
    password: str


class KeyCreateRequest(BaseModel):
    key: str
    password: str


class KeyUpdateRequest(BaseModel):
    key: Optional[str] = None
    password: Optional[str] = None


class KeyResponse(BaseModel):
    id: str
    key: str
    created_at: str
    updated_at: str


class KeyDetailResponse(BaseModel):
    id: str
    key: str
    password: str  # Decrypted password
    created_at: str
    updated_at: str


@keys_router.post("/unlock")
async def unlock_keys(
    request: UnlockRequest,
    user_email: str = Depends(get_current_email),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify user password and unlock keys for 5 minutes.
    Stores the derived encryption key for decrypting passwords.
    """
    # Verify password
    if not await verify_password(user_email, request.password, db):
        raise HTTPException(status_code=401, detail="Invalid password")

    # Unlock for 5 minutes and store encryption key
    unlock_user(user_email, request.password)
    return {"message": "Keys unlocked for 5 minutes", "unlocked": True}


@keys_router.get("")
async def list_keys(
    request: Request,
    user_email: str = Depends(get_current_email),
    db: AsyncSession = Depends(get_db),
):
    """
    List all keys for the current user (without passwords).
    """

    result = await db.execute(
        select(UserKeys)
        .filter(UserKeys.user_email == user_email)
        .order_by(UserKeys.updated_at.desc())
    )
    keys = result.scalars().all()

    return [
        KeyResponse(
            id=key.id,
            key=key.key,
            created_at=key.created_at.isoformat(),
            updated_at=key.updated_at.isoformat(),
        )
        for key in keys
    ]


@keys_router.get("/{key_id}")
async def get_key(
    key_id: str,
    request: Request,
    user_email: str = Depends(get_current_email),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific key with decrypted password.
    Requires user to be unlocked (password verified within last 5 minutes).
    """

    # Check if unlocked and get encryption key
    encryption_key = get_encryption_key(user_email)
    if not encryption_key:
        raise HTTPException(
            status_code=403,
            detail="Keys are locked. Please verify your password first.",
        )

    # Get key from database
    result = await db.execute(
        select(UserKeys).filter(
            UserKeys.id == key_id, UserKeys.user_email == user_email
        )
    )
    key = result.scalar_one_or_none()

    if not key:
        raise HTTPException(status_code=404, detail="Key not found")

    # Decrypt password using stored encryption key
    from cryptography.fernet import Fernet
    import base64

    try:
        fernet = Fernet(encryption_key)
        encrypted_bytes = base64.urlsafe_b64decode(key.encrypted_password.encode())
        decrypted_password = fernet.decrypt(encrypted_bytes).decode()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to decrypt password: {str(e)}"
        )

    return KeyDetailResponse(
        id=key.id,
        key=key.key,
        password=decrypted_password,
        created_at=key.created_at.isoformat(),
        updated_at=key.updated_at.isoformat(),
    )

    # We need the user's password to decrypt. Since we can't store it,
    # we'll need to get it from the request or use a different approach.
    # For now, we'll require the password to be sent with the request.
    # Actually, wait - we can't decrypt without the password. Let me reconsider.
    # The unlock endpoint verifies the password, but we don't store it.
    # We need to either:
    # 1. Store the password temporarily (not secure)
    # 2. Require password on each decrypt (not great UX)
    # 3. Use a master key derived from password that we store temporarily

    # Actually, the best approach is to store a derived key during unlock
    # But for simplicity, let's require password verification on unlock
    # and store a flag. But we still need the password to decrypt...

    # Let me think: we verify password on unlock, but we can't decrypt without it.
    # The solution: during unlock, we can derive and temporarily store the encryption key
    # OR we require the password to be sent with each decrypt request.

    # For better UX, let's store the derived key temporarily during unlock.
    # But that's still not ideal. Let me use a simpler approach:
    # Store the user's password hash temporarily (encrypted) or just accept
    # that we need the password for decryption.

    # Actually, I think the cleanest is to require password on unlock and store
    # a session token that allows decryption. But we still need the password.

    # Let me reconsider: we can derive the encryption key from password during unlock
    # and store it temporarily. But that's still a security risk.

    # For now, let's require the password to be sent with the get request.
    # The user is already unlocked, but we still need the password to decrypt.
    # This is a limitation we'll document.

    # Actually, wait - I can store the derived encryption key in the unlock session!
    # But that's still sensitive. Let me use a different approach:
    # Store a temporary decryption key that's derived from password + session.

    # For simplicity and security, let's require password verification
    # but cache the derived key during unlock. We'll store it encrypted.

    # Let me implement a simpler solution: store the user's password
    # temporarily in the unlock session (encrypted with a session key).
    # Actually, that's getting complex.

    # Best approach: Store the derived Fernet key in memory during unlock.
    # It's only in memory and only for 5 minutes.
    # This is acceptable for this use case.

    # But wait, I need to modify the unlock endpoint to also store the key.
    # Let me update the unlock_sessions to store the derived key.

    raise HTTPException(
        status_code=501,
        detail="Decryption requires password. Please implement key storage in unlock session.",
    )


@keys_router.post("")
async def create_key(
    request: KeyCreateRequest,
    user_email: str = Depends(get_current_email),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new key. Requires user to be unlocked.
    """
    # Check if unlocked and get encryption key
    encryption_key = get_encryption_key(user_email)
    if not encryption_key:
        raise HTTPException(
            status_code=403,
            detail="Keys are locked. Please verify your password first.",
        )

    # Encrypt the password using stored encryption key
    from cryptography.fernet import Fernet
    import base64

    fernet = Fernet(encryption_key)
    encrypted = fernet.encrypt(request.password.encode())
    encrypted_password = base64.urlsafe_b64encode(encrypted).decode()

    # Create new key
    key_id = str(uuid.uuid4())
    new_key = UserKeys(
        id=key_id,
        user_email=user_email,
        key=request.key,
        encrypted_password=encrypted_password,
    )

    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)

    return KeyResponse(
        id=new_key.id,
        key=new_key.key,
        created_at=new_key.created_at.isoformat(),
        updated_at=new_key.updated_at.isoformat(),
    )


@keys_router.put("/{key_id}")
async def update_key(
    key_id: str,
    request: KeyUpdateRequest,
    user_email: str = Depends(get_current_email),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a key. Requires user to be unlocked.
    """
    # Check if unlocked and get encryption key
    encryption_key = get_encryption_key(user_email)
    if not encryption_key:
        raise HTTPException(
            status_code=403,
            detail="Keys are locked. Please verify your password first.",
        )

    result = await db.execute(
        select(UserKeys).filter(
            UserKeys.id == key_id, UserKeys.user_email == user_email
        )
    )
    key = result.scalar_one_or_none()

    if not key:
        raise HTTPException(status_code=404, detail="Key not found")

    # Update fields
    if request.key is not None:
        key.key = request.key
    if request.password is not None:
        # Encrypt the new password
        from cryptography.fernet import Fernet
        import base64

        fernet = Fernet(encryption_key)
        encrypted = fernet.encrypt(request.password.encode())
        key.encrypted_password = base64.urlsafe_b64encode(encrypted).decode()

    key.updated_at = datetime.now()
    await db.commit()
    await db.refresh(key)

    return KeyResponse(
        id=key.id,
        key=key.key,
        created_at=key.created_at.isoformat(),
        updated_at=key.updated_at.isoformat(),
    )


@keys_router.delete("/{key_id}")
async def delete_key(
    key_id: str,
    user_email: str = Depends(get_current_email),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a key.
    """
    result = await db.execute(
        select(UserKeys).filter(
            UserKeys.id == key_id, UserKeys.user_email == user_email
        )
    )
    key = result.scalar_one_or_none()

    if not key:
        raise HTTPException(status_code=404, detail="Key not found")

    await db.delete(key)
    await db.commit()

    return {"message": "Key deleted successfully"}
