#!/usr/bin/env python3
import sys
import os

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from utils.password import hash_password

# Set the environment variable for the salt
os.environ['PASSWORD_SALT'] = os.getenv('PASSWORD_SALT')

# Generate the hash for "password"
password = "password"
hashed = hash_password(password)

print(f"Password: {password}")
print(f"Generated hash: {hashed}")
print()
print("SQL INSERT statement:")
print(f"INSERT INTO users (id, workspace_id, name, email, password_hash, avatar_url) VALUES ")
print(f"(uuid_generate_v4(), (SELECT id FROM workspaces WHERE name = 'Demo Company' LIMIT 1), 'Demo', 'demo@example.com', '{hashed}', 'https://avatars.githubusercontent.com/u/1234567?v=4')")
print("ON CONFLICT (id) DO NOTHING;") 