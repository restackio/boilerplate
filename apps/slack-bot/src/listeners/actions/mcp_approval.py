"""Handle MCP approval button clicks."""
import logging

logger = logging.getLogger(__name__)

from ...app import app


@app.action("mcp_approve")
def handle_mcp_approve(ack, body, client, say):
    """Handle when user approves an MCP tool request."""
    ack()
    
    try:
        user_id = body["user"]["id"]
        approval_id = body["actions"][0]["value"]
        channel_id = body["channel"]["id"]
        message_ts = body["message"]["ts"]
        thread_ts = body["message"].get("thread_ts") or message_ts
        
        # Get user info
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"]["real_name"] or user_info["user"]["name"]
        
        logger.info(f"User {user_name} approved MCP tool (approval_id: {approval_id})")
        
        # Update the message to show approval
        client.chat_update(
            channel=channel_id,
            ts=message_ts,
            text=f"✅ Approved by {user_name}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"✅ *Approved* by <@{user_id}>"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Approval ID: `{approval_id}`"
                        }
                    ]
                }
            ]
        )
        
        # Send approval to backend workflow
        # TODO: This should call a workflow or send a signal/event
        # For now, we'll need to implement a callback mechanism
        
        # Send confirmation in thread
        say(
            text=f"✅ Approved! Continuing with the tool execution...",
            thread_ts=thread_ts
        )
        
        # TODO: Call backend to send approval
        # from ...client import client as restack_client
        # await restack_client.send_workflow_event(
        #     workflow_id=workflow_id,
        #     event_name="mcp_approval",
        #     event_data={"approval_id": approval_id, "approved": True}
        # )
        
    except Exception as e:
        logger.exception(f"Error handling MCP approval: {e}")


@app.action("mcp_reject")
def handle_mcp_reject(ack, body, client, say):
    """Handle when user rejects an MCP tool request."""
    ack()
    
    try:
        user_id = body["user"]["id"]
        approval_id = body["actions"][0]["value"]
        channel_id = body["channel"]["id"]
        message_ts = body["message"]["ts"]
        thread_ts = body["message"].get("thread_ts") or message_ts
        
        # Get user info
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"]["real_name"] or user_info["user"]["name"]
        
        logger.info(f"User {user_name} rejected MCP tool (approval_id: {approval_id})")
        
        # Update the message to show rejection
        client.chat_update(
            channel=channel_id,
            ts=message_ts,
            text=f"❌ Rejected by {user_name}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"❌ *Rejected* by <@{user_id}>"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Approval ID: `{approval_id}`"
                        }
                    ]
                }
            ]
        )
        
        # Send confirmation in thread
        say(
            text=f"❌ Request rejected. I'll find another way to help.",
            thread_ts=thread_ts
        )
        
        # TODO: Send rejection to backend workflow
        
    except Exception as e:
        logger.exception(f"Error handling MCP rejection: {e}")

