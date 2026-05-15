#!/usr/bin/env python3
"""Set the admin user password and print it so you can save it.
Usage: set_admin_password.py [new_password]
  If new_password is omitted, a random password is generated.
Requires: PYTHONPATH pointing to backend (apps/backend or /app in Docker), DATABASE_URL.
"""

import os
import secrets
import sys

ADMIN_EMAIL = "admin@example.com"


def main() -> None:
    if len(sys.argv) > 1:
        password = sys.argv[1].strip()
        if len(password) < 8:
            print("Error: Password must be at least 8 characters.", file=sys.stderr)
            sys.exit(1)
    else:
        password = secrets.token_urlsafe(14)

    try:
        from src.utils.password import hash_password
    except ImportError:
        print(
            "Error: Run with PYTHONPATH set to backend (e.g. apps/backend or /app in Docker).",
            file=sys.stderr,
        )
        sys.exit(1)

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL is not set.", file=sys.stderr)
        sys.exit(1)

    try:
        import psycopg2
    except ImportError:
        print(
            "Error: psycopg2 is required (install backend dependencies).",
            file=sys.stderr,
        )
        sys.exit(1)

    password_hash = hash_password(password)
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET password_hash = %s WHERE email = %s",
            (password_hash, ADMIN_EMAIL),
        )
        updated = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error updating password: {e}", file=sys.stderr)
        sys.exit(1)

    if updated == 0:
        print(
            "Error: Admin user (admin@example.com) not found. Run admin seed first.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(password)


if __name__ == "__main__":
    main()
