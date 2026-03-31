"""Format Slack messages for task creation and display."""


def format_slack_message_for_task(
    user_name: str,
    user_id: str,
    message_text: str,
    channel_id: str,
    message_ts: str | None = None,
    is_channel_message: bool = False,
) -> tuple[str, str]:
    """
    Format a Slack message into task title and description.

    Returns:
        tuple: (title, description)
    """
    if is_channel_message:
        title = f"Slack Request: {user_name}"
    else:
        title = f"Slack DM: {user_name}"

    if len(message_text) > 50:
        title = f"{title} - {message_text[:47]}..."
    else:
        title = f"{title} - {message_text}"

    description = message_text

    return title, description
