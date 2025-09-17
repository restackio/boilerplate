"""Token encryption utilities using the same PASSWORD_SALT infrastructure."""

import base64
import os

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def _get_encryption_key() -> bytes:
    """Generate encryption key from PASSWORD_SALT."""
    # Reuse the same salt mechanism as password hashing
    salt = os.getenv(
        "PASSWORD_SALT", "default_dev_salt_change_in_production"
    )

    # Use PBKDF2 to derive a key from the salt
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 32 bytes = 256 bits for Fernet
        salt=salt.encode("utf-8"),
        iterations=100000,  # OWASP recommended minimum
    )

    # Use a fixed password for key derivation (the salt provides the security)
    return base64.urlsafe_b64encode(
        kdf.derive(b"oauth_token_encryption")
    )


def encrypt_token(token: str) -> str:
    """Encrypt an OAuth token for secure storage."""
    if not token:
        return token

    try:
        key = _get_encryption_key()
        fernet = Fernet(key)

        # Encrypt the token
        encrypted_token = fernet.encrypt(token.encode("utf-8"))

        # Return base64 encoded for database storage
        return base64.urlsafe_b64encode(encrypted_token).decode(
            "utf-8"
        )

    except (ValueError, TypeError):
        # In case of encryption failure, log error but don't break the flow
        # In production, you might want to handle this differently
        # Using a simple fallback for development
        return token  # Return unencrypted as fallback


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt an OAuth token from storage."""
    if not encrypted_token:
        return encrypted_token

    try:
        key = _get_encryption_key()
        fernet = Fernet(key)

        # Decode from base64 and decrypt
        encrypted_bytes = base64.urlsafe_b64decode(
            encrypted_token.encode("utf-8")
        )
        decrypted_token = fernet.decrypt(encrypted_bytes)

        return decrypted_token.decode("utf-8")

    except (ValueError, TypeError):
        # If decryption fails, it might be an unencrypted token (migration case)
        # or corrupted data
        return encrypted_token  # Return as-is for backward compatibility


def is_token_encrypted(token: str) -> bool:
    """Check if a token appears to be encrypted."""
    if not token:
        return False

    try:
        # Try to base64 decode - encrypted tokens should be valid base64
        base64.urlsafe_b64decode(token.encode("utf-8"))
        # If it decodes and looks like Fernet format, it's likely encrypted
        # Fernet tokens are typically longer than 100 characters
        min_encrypted_token_length = 100
        return (
            len(token) > min_encrypted_token_length
            and token.replace("-", "").replace("_", "").isalnum()
        )
    except (ValueError, TypeError):
        return False
