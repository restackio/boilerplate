import asyncio
import logging
import webbrowser
from pathlib import Path

from watchfiles import run_process

from src.agents.agent_task import AgentTask
from src.client import client
from src.functions.llm_chat import llm_chat
from src.functions.llm_response import llm_response
from src.functions.agents_crud import (
    agents_read, agents_create, agents_update, agents_delete, 
    agents_get_by_id, agents_get_by_status, agents_get_versions
)
from src.functions.tasks_crud import (
    tasks_read, tasks_create, tasks_update, tasks_delete,
    tasks_get_by_id, tasks_update_agent_task_id
)
from src.functions.workspaces_crud import (
    workspaces_read, workspaces_create, workspaces_update, workspaces_delete,
    workspaces_get_by_id
)
from src.functions.users_crud import (
    users_read, users_create, users_update, users_delete,
    users_get_by_id, users_get_by_email, users_get_by_workspace
)
from src.functions.teams_crud import (
    teams_read, teams_create, teams_update, teams_delete,
    teams_get_by_id
)
from src.functions.user_workspaces_crud import (
    user_workspaces_get_by_user, user_workspaces_get_by_workspace,
    user_workspaces_create, user_workspaces_update, user_workspaces_delete
)
from src.functions.auth_crud import (
    user_signup, user_login
)
from src.workflows.agents_crud import (
    AgentsReadWorkflow, AgentsCreateWorkflow, AgentsUpdateWorkflow,
    AgentsDeleteWorkflow, AgentsGetByIdWorkflow, AgentsGetByStatusWorkflow,
    AgentsGetVersionsWorkflow,
)
from src.workflows.tasks_crud import (
    TasksReadWorkflow, TasksCreateWorkflow, TasksUpdateWorkflow,
    TasksDeleteWorkflow, TasksGetByIdWorkflow, TasksUpdateAgentTaskIdWorkflow
)
from src.workflows.workspaces_crud import (
    WorkspacesReadWorkflow, WorkspacesCreateWorkflow, WorkspacesUpdateWorkflow,
    WorkspacesDeleteWorkflow, WorkspacesGetByIdWorkflow
)
from src.workflows.users_crud import (
    UsersReadWorkflow, UsersCreateWorkflow, UsersUpdateWorkflow,
    UsersDeleteWorkflow, UsersGetByIdWorkflow, UsersGetByEmailWorkflow,
    UsersGetByWorkspaceWorkflow
)
from src.workflows.teams_crud import (
    TeamsReadWorkflow, TeamsCreateWorkflow, TeamsUpdateWorkflow,
    TeamsDeleteWorkflow, TeamsGetByIdWorkflow
)
from src.workflows.user_workspaces_crud import (
    UserWorkspacesGetByUserWorkflow, UserWorkspacesGetByWorkspaceWorkflow,
    UserWorkspacesCreateWorkflow, UserWorkspacesUpdateWorkflow, UserWorkspacesDeleteWorkflow
)
from src.workflows.auth_crud import (
    UserSignupWorkflow, UserLoginWorkflow
)
from src.workflows.mcp_servers_crud import (
    McpServersReadWorkflow, McpServersCreateWorkflow, McpServersUpdateWorkflow,
    McpServersDeleteWorkflow, McpServersGetByIdWorkflow
)
from src.workflows.agent_mcp_servers_crud import (
    AgentMcpServersReadByAgentWorkflow, AgentMcpServersCreateWorkflow, AgentMcpServersUpdateWorkflow,
    AgentMcpServersDeleteWorkflow, AgentMcpServersGetByIdWorkflow
)
from src.functions.mcp_servers_crud import (
    mcp_servers_read, mcp_servers_create, mcp_servers_update, mcp_servers_delete, mcp_servers_get_by_id
)
from src.functions.agent_mcp_servers_crud import (
    agent_mcp_servers_read_by_agent, agent_mcp_servers_create, agent_mcp_servers_update, agent_mcp_servers_delete, agent_mcp_servers_get_by_id
)
from src.functions.send_agent_event import send_agent_event
from src.database.connection import init_async_db


async def main() -> None:
    # Initialize database
    init_async_db()
    logging.info("Database initialized")
    
    await client.start_service(
        agents=[AgentTask],
        workflows=[
            AgentsReadWorkflow, AgentsCreateWorkflow, AgentsUpdateWorkflow,
            AgentsDeleteWorkflow, AgentsGetByIdWorkflow, AgentsGetByStatusWorkflow,
            AgentsGetVersionsWorkflow,
            TasksReadWorkflow, TasksCreateWorkflow, TasksUpdateWorkflow,
            TasksDeleteWorkflow, TasksGetByIdWorkflow, TasksUpdateAgentTaskIdWorkflow,
            WorkspacesReadWorkflow, WorkspacesCreateWorkflow, WorkspacesUpdateWorkflow,
            WorkspacesDeleteWorkflow, WorkspacesGetByIdWorkflow,
            UsersReadWorkflow, UsersCreateWorkflow, UsersUpdateWorkflow,
            UsersDeleteWorkflow, UsersGetByIdWorkflow, UsersGetByEmailWorkflow,
            UsersGetByWorkspaceWorkflow,
            TeamsReadWorkflow, TeamsCreateWorkflow, TeamsUpdateWorkflow,
            TeamsDeleteWorkflow, TeamsGetByIdWorkflow,
            UserWorkspacesGetByUserWorkflow, UserWorkspacesGetByWorkspaceWorkflow,
            UserWorkspacesCreateWorkflow, UserWorkspacesUpdateWorkflow, UserWorkspacesDeleteWorkflow,
            UserSignupWorkflow, UserLoginWorkflow,
            McpServersReadWorkflow, McpServersCreateWorkflow, McpServersUpdateWorkflow,
            McpServersDeleteWorkflow, McpServersGetByIdWorkflow,
            AgentMcpServersReadByAgentWorkflow, AgentMcpServersCreateWorkflow, AgentMcpServersUpdateWorkflow,
            AgentMcpServersDeleteWorkflow, AgentMcpServersGetByIdWorkflow,
        ],
        functions=[
            send_agent_event, llm_chat, llm_response,
            agents_read, agents_create, agents_update, agents_delete,
            agents_get_by_id, agents_get_by_status, agents_get_versions,
            tasks_read, tasks_create, tasks_update, tasks_delete,
            tasks_get_by_id, tasks_update_agent_task_id,
            workspaces_read, workspaces_create, workspaces_update, workspaces_delete,
            workspaces_get_by_id,
            users_read, users_create, users_update, users_delete,
            users_get_by_id, users_get_by_email, users_get_by_workspace,
            teams_read, teams_create, teams_update, teams_delete, teams_get_by_id,
            user_workspaces_get_by_user, user_workspaces_get_by_workspace,
            user_workspaces_create, user_workspaces_update, user_workspaces_delete,
            user_signup, user_login,
            mcp_servers_read, mcp_servers_create, mcp_servers_update, mcp_servers_delete, mcp_servers_get_by_id,
            agent_mcp_servers_read_by_agent, agent_mcp_servers_create, agent_mcp_servers_update, agent_mcp_servers_delete, agent_mcp_servers_get_by_id,
        ],
    )


def run_services() -> None:
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Service interrupted by user. Exiting gracefully.")


def watch_services() -> None:
    watch_path = Path.cwd()
    logging.info("Watching %s and its subdirectories for changes...", watch_path)
    webbrowser.open("http://localhost:5233")
    run_process(watch_path, recursive=True, target=run_services)


if __name__ == "__main__":
    run_services()
