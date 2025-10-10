import os

import bcrypt


def hash_password(password: str) -> str:
    """Hash a password using bcrypt with a salt from environment variable."""
    # Get salt from environment variable, or use a default for development
    salt = os.getenv(
        "PASSWORD_SALT", "default_dev_salt_change_in_production"
    )

    # Encode the password and salt as bytes
    password_bytes = password.encode("utf-8")
    salt.encode("utf-8")

    # Hash the password with the salt
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        password_bytes = password.encode("utf-8")
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except (ValueError, TypeError, AttributeError):
        return False


def generate_demo_password_hash() -> str:
    """Generate a hash for the demo password 'password'."""
    return hash_password("password")
