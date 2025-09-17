"""FastAPI webhook application."""
import json
import logging
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .client import client
from .formatters import format_webhook_payload_as_task_description
from .models import TaskCreateInput, WebhookTaskInput

# Create logger for this module
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """FastAPI lifespan manager."""
    logger.info("Webhook server initialized")
    yield
    logger.info("Webhook server shut down")


def create_webhook_app() -> FastAPI:
    """Create a FastAPI app that creates tasks from webhooks."""
    app = FastAPI(
        title="Webhook Server",
        description="Creates tasks from webhook events for specific agents",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS for webhook sources
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure based on your webhook sources
        allow_credentials=False,
        allow_methods=["POST", "GET"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        """Health check endpoint."""
        return {"status": "healthy", "service": "webhook-server"}

    @app.post("/webhook/workspace/{workspace_id}/agent/{agent_name}")
    async def create_task_from_webhook(
        workspace_id: str,
        agent_name: str,
        request: Request,
        task_input: WebhookTaskInput
    ) -> dict[str, Any]:
        """Create a task from a webhook event for a specific agent in a workspace.

        URL format: /webhook/workspace/{workspace_id}/agent/{agent_name}

        The agent_name should be in slug format: github-pr-agent, zendesk-support, billing-bot

        Examples:
        - /webhook/workspace/ws-123/agent/zendesk-support

        Body should contain:
        {
          "title": "optional custom title",
          "description": "optional custom description"
        }
        """
        try:
            # Get webhook payload and headers
            body = await request.body()
            headers = dict(request.headers)

            # Parse JSON payload from the original webhook
            try:
                webhook_payload = json.loads(body.decode()) if body else {}
            except json.JSONDecodeError:
                webhook_payload = {"raw_body": body.decode() if body else ""}

            # Use provided title/description or generate from webhook
            if task_input.title and task_input.description:
                title = task_input.title
                description = task_input.description
            else:
                title, description = format_webhook_payload_as_task_description(
                    headers, webhook_payload
                )

            workflow_id = f"webhook_task_{agent_name}_{int(time.time())}"

            result = await client.schedule_workflow(
                workflow_name="TasksCreateWorkflow",
                workflow_id=workflow_id,
                workflow_input=TaskCreateInput(
                    workspace_id=workspace_id,
                    title=title,
                    description=description,
                    status="open",
                    agent_name=agent_name,
                )
            )

            logger.info("Created task from webhook for agent %s in workspace %s", agent_name, workspace_id)

            return {
                "status": "success",
                "message": f"Task created for agent {agent_name} in workspace {workspace_id}",
                "task_id": str(result),
                "task_url": f"http://localhost:3000/tasks/{result}",
            }
        except Exception as e:
            logger.exception("Error creating task from webhook for agent %s", agent_name)
            raise HTTPException(status_code=500, detail=str(e)) from e

    return app
