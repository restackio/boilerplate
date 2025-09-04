import asyncio
import logging
import webbrowser
from pathlib import Path

from watchfiles import run_process

from src.agents.agent_task import AgentTask
from src.client import client
from src.database.connection import init_async_db
from src.functions.agent_tools_crud import (
    agent_tools_create,
    agent_tools_delete,
    agent_tools_read_by_agent,
    agent_tools_read_records_by_agent,
    agent_tools_update,
)
from src.functions.agents_crud import (
    agents_create,
    agents_delete,
    agents_get_by_id,
    agents_get_by_status,
    agents_get_versions,
    agents_read,
    agents_resolve_by_name,
    agents_update,
)
from src.functions.auth_crud import user_login, user_signup
from src.functions.llm_prepare_response import (
    llm_prepare_response,
)
from src.functions.llm_response_stream import llm_response_stream
from src.functions.mcp_servers_crud import (
    mcp_servers_create,
    mcp_servers_delete,
    mcp_servers_get_by_id,
    mcp_servers_read,
    mcp_servers_update,
)
from src.functions.restack_engine import (
    restack_engine_api_schedule,
)
from src.functions.schedule_crud import (
    schedule_create_workflow,
    schedule_get_task_info,
    schedule_update_database,
    schedule_update_workflow,
)
from src.functions.send_agent_event import send_agent_event
from src.functions.tasks_crud import (
    tasks_create,
    tasks_delete,
    tasks_get_by_id,
    tasks_read,
    tasks_update,
    tasks_update_agent_task_id,
)
from src.functions.teams_crud import (
    teams_create,
    teams_delete,
    teams_get_by_id,
    teams_read,
    teams_update,
)
from src.functions.user_workspaces_crud import (
    user_workspaces_create,
    user_workspaces_delete,
    user_workspaces_get_by_user,
    user_workspaces_get_by_workspace,
    user_workspaces_update,
)
from src.functions.users_crud import (
    users_create,
    users_delete,
    users_get_by_email,
    users_get_by_id,
    users_get_by_workspace,
    users_read,
    users_update,
)
from src.functions.workspaces_crud import (
    workspaces_create,
    workspaces_delete,
    workspaces_get_by_id,
    workspaces_read,
    workspaces_update,
)
from src.workflows.crud.agent_tools_crud import (
    AgentToolsCreateWorkflow,
    AgentToolsDeleteWorkflow,
    AgentToolsReadByAgentWorkflow,
    AgentToolsReadRecordsByAgentWorkflow,
    AgentToolsUpdateWorkflow,
)
from src.workflows.crud.agents_crud import (
    AgentsCreateWorkflow,
    AgentsDeleteWorkflow,
    AgentsGetByIdWorkflow,
    AgentsGetByStatusWorkflow,
    AgentsGetVersionsWorkflow,
    AgentsReadWorkflow,
    AgentsUpdateWorkflow,
)
from src.workflows.crud.auth_crud import (
    UserLoginWorkflow,
    UserSignupWorkflow,
)
from src.workflows.crud.mcp_servers_crud import (
    McpServersCreateWorkflow,
    McpServersDeleteWorkflow,
    McpServersGetByIdWorkflow,
    McpServersReadWorkflow,
    McpServersUpdateWorkflow,
)
from src.workflows.crud.schedule_crud import (
    ScheduleControlWorkflow,
    ScheduleCreateWorkflow,
    ScheduleEditWorkflow,
    ScheduleUpdateWorkflow,
)
from src.workflows.crud.tasks_crud import (
    TasksCreateWorkflow,
    TasksDeleteWorkflow,
    TasksGetByIdWorkflow,
    TasksReadWorkflow,
    TasksUpdateAgentTaskIdWorkflow,
    TasksUpdateWorkflow,
)
from src.workflows.crud.teams_crud import (
    TeamsCreateWorkflow,
    TeamsDeleteWorkflow,
    TeamsGetByIdWorkflow,
    TeamsReadWorkflow,
    TeamsUpdateWorkflow,
)
from src.workflows.crud.user_workspaces_crud import (
    UserWorkspacesCreateWorkflow,
    UserWorkspacesDeleteWorkflow,
    UserWorkspacesGetByUserWorkflow,
    UserWorkspacesGetByWorkspaceWorkflow,
    UserWorkspacesUpdateWorkflow,
)
from src.workflows.crud.users_crud import (
    UsersCreateWorkflow,
    UsersDeleteWorkflow,
    UsersGetByEmailWorkflow,
    UsersGetByIdWorkflow,
    UsersGetByWorkspaceWorkflow,
    UsersReadWorkflow,
    UsersUpdateWorkflow,
)
from src.workflows.crud.workspaces_crud import (
    WorkspacesCreateWorkflow,
    WorkspacesDeleteWorkflow,
    WorkspacesGetByIdWorkflow,
    WorkspacesReadWorkflow,
    WorkspacesUpdateWorkflow,
)


async def run_restack_service() -> None:
    """Run the Restack service."""
    await client.start_service(
        agents=[AgentTask],
        workflows=[
            AgentsReadWorkflow,
            AgentsCreateWorkflow,
            AgentsUpdateWorkflow,
            AgentsDeleteWorkflow,
            AgentsGetByIdWorkflow,
            AgentsGetByStatusWorkflow,
            AgentsGetVersionsWorkflow,
            TasksReadWorkflow,
            TasksCreateWorkflow,
            TasksUpdateWorkflow,
            TasksDeleteWorkflow,
            TasksGetByIdWorkflow,
            TasksUpdateAgentTaskIdWorkflow,
            WorkspacesReadWorkflow,
            WorkspacesCreateWorkflow,
            WorkspacesUpdateWorkflow,
            WorkspacesDeleteWorkflow,
            WorkspacesGetByIdWorkflow,
            UsersReadWorkflow,
            UsersCreateWorkflow,
            UsersUpdateWorkflow,
            UsersDeleteWorkflow,
            UsersGetByIdWorkflow,
            UsersGetByEmailWorkflow,
            UsersGetByWorkspaceWorkflow,
            TeamsReadWorkflow,
            TeamsCreateWorkflow,
            TeamsUpdateWorkflow,
            TeamsDeleteWorkflow,
            TeamsGetByIdWorkflow,
            UserWorkspacesGetByUserWorkflow,
            UserWorkspacesGetByWorkspaceWorkflow,
            UserWorkspacesCreateWorkflow,
            UserWorkspacesUpdateWorkflow,
            UserWorkspacesDeleteWorkflow,
            UserSignupWorkflow,
            UserLoginWorkflow,
            McpServersReadWorkflow,
            McpServersCreateWorkflow,
            McpServersUpdateWorkflow,
            McpServersDeleteWorkflow,
            McpServersGetByIdWorkflow,
            AgentToolsReadByAgentWorkflow,
            AgentToolsReadRecordsByAgentWorkflow,
            AgentToolsCreateWorkflow,
            AgentToolsUpdateWorkflow,
            AgentToolsDeleteWorkflow,
            ScheduleCreateWorkflow,
            ScheduleUpdateWorkflow,
            ScheduleEditWorkflow,
            ScheduleControlWorkflow,
        ],
        functions=[
            send_agent_event,
            llm_response_stream,
            llm_prepare_response,
            agents_read,
            agents_create,
            agents_update,
            agents_delete,
            agents_get_by_id,
            agents_get_by_status,
            agents_get_versions,
            agents_resolve_by_name,
            tasks_read,
            tasks_create,
            tasks_update,
            tasks_delete,
            tasks_get_by_id,
            tasks_update_agent_task_id,
            schedule_create_workflow,
            schedule_update_workflow,
            schedule_get_task_info,
            schedule_update_database,
            restack_engine_api_schedule,
            workspaces_read,
            workspaces_create,
            workspaces_update,
            workspaces_delete,
            workspaces_get_by_id,
            users_read,
            users_create,
            users_update,
            users_delete,
            users_get_by_id,
            users_get_by_email,
            users_get_by_workspace,
            teams_read,
            teams_create,
            teams_update,
            teams_delete,
            teams_get_by_id,
            user_workspaces_get_by_user,
            user_workspaces_get_by_workspace,
            user_workspaces_create,
            user_workspaces_update,
            user_workspaces_delete,
            user_signup,
            user_login,
            mcp_servers_read,
            mcp_servers_create,
            mcp_servers_update,
            mcp_servers_delete,
            mcp_servers_get_by_id,
            # Agent tools functions
            agent_tools_read_by_agent,
            agent_tools_read_records_by_agent,
            agent_tools_create,
            agent_tools_update,
            agent_tools_delete,
        ],
    )


async def main() -> None:
    """Main function to run Restack services."""
    # Initialize database
    await init_async_db()
    logging.info("Database initialized")

    logging.info(
        "Starting Restack services on default port (5233)"
    )
    await run_restack_service()


def start() -> None:
    """Start Restack services (production mode)."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info(
            "Services interrupted by user. Exiting gracefully."
        )


def dev_watch() -> None:
    """Development mode with file watching and auto-restart."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    watch_path = Path.cwd()
    logging.info(
        "Watching %s and its subdirectories for changes...",
        watch_path,
    )
    webbrowser.open("http://localhost:5233")
    run_process(watch_path, recursive=True, target=start)


if __name__ == "__main__":
    # Simple direct execution
    start()
