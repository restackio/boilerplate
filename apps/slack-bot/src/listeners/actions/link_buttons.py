"""Acknowledge URL-opening buttons so Slack doesn't show a 404 warning.

Buttons with a ``url`` property open the link in the browser, but Slack still
sends an interaction payload to the app.  Without a registered handler Bolt
returns 404, which surfaces as a tooltip warning in the Slack UI.
"""

from ...app import app

_URL_BUTTON_ACTIONS = [
    "onboarding_configure_agents",
    "no_agent_open_slack_integrations",
    "app_home_configure_agents",
    "view_dashboard",
]

for _action_id in _URL_BUTTON_ACTIONS:

    @app.action(_action_id)
    def _ack(ack):
        ack()
