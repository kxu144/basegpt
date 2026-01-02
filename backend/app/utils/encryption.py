"""
Encryption utilities for user keys.
Uses the user's password to derive an encryption key.
"""

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import hashlib


def derive_key_from_password(password: str, salt: bytes = None) -> bytes:
    """
    Derive an encryption key from the user's password using PBKDF2.
    Uses a fixed salt based on the password hash for consistency.
    """
    if salt is None:
        # Use a deterministic salt based on password hash
        # This ensures the same password always produces the same key
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        salt = password_hash[:16].encode()  # Use first 16 chars as salt

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend(),
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return key


def encrypt_password(plain_password: str, user_password: str) -> str:
    """
    Encrypt a password using the user's password as the encryption key.
    Returns base64-encoded encrypted string.
    """
    key = derive_key_from_password(user_password)
    fernet = Fernet(key)
    encrypted = fernet.encrypt(plain_password.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_password(encrypted_password: str, user_password: str) -> str:
    """
    Decrypt a password using the user's password as the decryption key.
    Takes base64-encoded encrypted string and returns plain text.
    """
    try:
        key = derive_key_from_password(user_password)
        fernet = Fernet(key)
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_password.encode())
        decrypted = fernet.decrypt(encrypted_bytes)
        return decrypted.decode()
    except Exception as e:
        raise ValueError(f"Failed to decrypt password: {str(e)}")
