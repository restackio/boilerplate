#!/usr/bin/env python3
"""Demo script to generate password hash."""
import os
import sys
from pathlib import Path

# Add the src directory to the path
sys.path.append(str(Path(__file__).parent / "src"))

from utils.password import hash_password

# Set the environment variable for the salt
os.environ["PASSWORD_SALT"] = os.getenv("PASSWORD_SALT")

# Generate the hash for demo password
demo_password = "password"  # noqa: S105
hashed = hash_password(demo_password)
