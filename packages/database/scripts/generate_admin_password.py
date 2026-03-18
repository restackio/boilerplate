#!/usr/bin/env python3
"""Generate a random admin password and bcrypt hash for admin seed.
Outputs to stdout: line 1 = plain password, line 2 = empty, rest = modified SQL.
Called from insert-admin.sh; expects PYTHONPATH including apps/backend (repo root).
"""
import os
import secrets
import sys


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: generate_admin_password.py <path-to-postgres-admin.sql>", file=sys.stderr)
        sys.exit(1)
    sql_path = sys.argv[1]
    if not os.path.isfile(sql_path):
        print(f"Error: SQL file not found: {sql_path}", file=sys.stderr)
        sys.exit(1)

    # Import from backend (PYTHONPATH=apps/backend when run from repo root)
    try:
        from src.utils.password import hash_password
    except ImportError:
        print(
            "Error: Run from repo root with PYTHONPATH=apps/backend (e.g. PYTHONPATH=apps/backend python packages/database/scripts/generate_admin_password.py ...)",
            file=sys.stderr,
        )
        sys.exit(1)

    password = secrets.token_urlsafe(14)
    password_hash = hash_password(password)

    sql_content = open(sql_path, encoding="utf-8").read()
    if "__ADMIN_PASSWORD_HASH__" not in sql_content:
        print("Error: SQL file must contain __ADMIN_PASSWORD_HASH__ placeholder", file=sys.stderr)
        sys.exit(1)
    sql_content = sql_content.replace("__ADMIN_PASSWORD_HASH__", password_hash.replace("'", "''"))

    # Single run: first line = password (for display), then SQL for psql
    print(password)
    print()
    print(sql_content, end="")


if __name__ == "__main__":
    main()
