# Security Notes

## Workspace invite identity model

Workspace invite redemption currently trusts the client-supplied `user_id` and resolves the redeemer email from the `users` table. This matches the existing auth model used across the app, but it is not equivalent to a server-verified session.

To contain migration risk, invite flows resolve identity through `apps/backend/src/utils/auth_context.py` (`resolve_redeemer`). When the app moves to server-side sessions, this helper is the single swap-point for invite identity checks.

## Workspace invite token lifetime

Workspace invite tokens do not expire automatically. A token remains valid while the invite status is `pending`, and becomes invalid once accepted, declined, or revoked.

Because links are non-expiring, workspace owners should revoke any pending invite if they suspect token leakage.
