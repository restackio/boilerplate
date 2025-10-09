import asyncio
import logging
import os
import webbrowser
from pathlib import Path

from watchfiles import run_process

from src.agents.agent_task import AgentTask
from src.client import client
from src.database.connection import init_async_db
from src.functions.agent_subagents_crud import (
    agent_subagents_create,
    agent_subagents_delete,
    agent_subagents_get_available,
    agent_subagents_read,
    agent_subagents_toggle,
)
from src.functions.agent_tools_crud import (
    agent_tools_create,
    agent_tools_delete,
    agent_tools_read_by_agent,
    agent_tools_read_records_by_agent,
    agent_tools_update,
)
from src.functions.agents_crud import (
    agents_archive,
    agents_clone,
    agents_create,
    agents_delete,
    agents_get_by_id,
    agents_get_by_status,
    agents_get_versions,
    agents_read,
    agents_read_table,
    agents_resolve_by_name,
    agents_update,
    agents_update_status,
)
from src.functions.analytics_metrics import get_analytics_metrics
from src.functions.auth_crud import user_login, user_signup
from src.functions.data_ingestion import (
    ingest_pipeline_events,
    query_clickhouse_data,
)
from src.functions.datasets_crud import (
    datasets_create,
    datasets_get_by_id,
    datasets_read,
    query_dataset_events,
)
from src.functions.feedback_metrics import (
    get_detailed_feedbacks,
    get_feedback_analytics,
    get_task_feedback,
    ingest_feedback_metric,
)
from src.functions.llm_prepare_response import (
    llm_prepare_response,
)
from src.functions.llm_response_stream import llm_response_stream
from src.functions.mcp_oauth_client import (
    oauth_exchange_code_for_token,
    oauth_generate_auth_url,
    oauth_parse_callback,
    oauth_refresh_token,
)
from src.functions.mcp_oauth_crud import (
    get_oauth_token_for_mcp_server,
    mcp_server_get_by_id,
    oauth_token_create_or_update,
    oauth_token_delete,
    oauth_token_get_by_user_and_server,
    oauth_token_set_default,
    oauth_token_set_default_by_id,
    oauth_tokens_get_by_workspace,
)
from src.functions.mcp_servers_crud import (
    mcp_servers_create,
    mcp_servers_delete,
    mcp_servers_get_by_id,
    mcp_servers_read,
    mcp_servers_update,
)
from src.functions.mcp_tools_refresh import (
    mcp_session_init,
    mcp_tools_list,
    mcp_tools_list_direct,
)
from src.functions.metrics_crud import (
    create_metric_definition,
    delete_metric_definition,
    get_metric_definition_by_id,
    list_metric_definitions,
    update_metric_definition,
)
from src.functions.metrics_evaluation import (
    evaluate_formula_metric,
    evaluate_llm_judge_metric,
    evaluate_python_code_metric,
    ingest_performance_metrics,
    ingest_quality_metrics,
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
from src.functions.subtask_notify import subtask_notify
from src.functions.task_metrics_crud import (
    get_task_metrics_clickhouse,
)
from src.functions.tasks_by_metrics import (
    get_tasks_by_feedback,
    get_tasks_by_metric_failure,
)
from src.functions.tasks_crud import (
    tasks_create,
    tasks_delete,
    tasks_get_by_id,
    tasks_get_by_parent_id,
    tasks_get_stats,
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
from src.functions.traces_crud import (
    get_task_traces_from_clickhouse,
)
from src.functions.traces_query import (
    aggregate_traces_for_task,
    query_traces_batch,
    query_traces_for_response,
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
from src.workflows.analytics_metrics import GetAnalyticsMetrics
from src.workflows.create_metric_with_retroactive import (
    CreateMetricWithRetroactiveWorkflow,
)
from src.workflows.crud.agent_subagents_crud import (
    AgentSubagentsCreateWorkflow,
    AgentSubagentsDeleteWorkflow,
    AgentSubagentsGetAvailableWorkflow,
    AgentSubagentsReadWorkflow,
    AgentSubagentsToggleWorkflow,
)
from src.workflows.crud.agent_tools_crud import (
    AgentToolsCreateWorkflow,
    AgentToolsDeleteWorkflow,
    AgentToolsReadByAgentWorkflow,
    AgentToolsReadRecordsByAgentWorkflow,
    AgentToolsUpdateWorkflow,
)
from src.workflows.crud.agents_crud import (
    AgentsArchiveWorkflow,
    AgentsCloneWorkflow,
    AgentsCreateWorkflow,
    AgentsDeleteWorkflow,
    AgentsGetByIdWorkflow,
    AgentsGetByStatusWorkflow,
    AgentsGetVersionsWorkflow,
    AgentsReadTableWorkflow,
    AgentsReadWorkflow,
    AgentsUpdateStatusWorkflow,
    AgentsUpdateWorkflow,
)
from src.workflows.crud.auth_crud import (
    UserLoginWorkflow,
    UserSignupWorkflow,
)
from src.workflows.crud.datasets_crud import (
    DatasetsGetByIdWorkflow,
    DatasetsReadWorkflow,
    QueryDatasetEventsWorkflow,
)
from src.workflows.crud.mcp_oauth_sdk import (
    BearerTokenCreateWorkflow,
    McpOAuthCallbackWorkflow,
    McpOAuthInitializeWorkflow,
    OAuthTokenDeleteWorkflow,
    OAuthTokenRefreshWorkflow,
    OAuthTokenSetDefaultByIdWorkflow,
    OAuthTokenSetDefaultWorkflow,
    OAuthTokensGetByWorkspaceWorkflow,
)
from src.workflows.crud.mcp_servers_crud import (
    McpServersCreateWorkflow,
    McpServersDeleteWorkflow,
    McpServersGetByIdWorkflow,
    McpServersReadWorkflow,
    McpServersUpdateWorkflow,
    McpToolsListWorkflow,
)
from src.workflows.crud.metrics_crud import (
    CreateMetricDefinitionWorkflow,
    DeleteMetricDefinitionWorkflow,
    ListMetricDefinitionsWorkflow,
    UpdateMetricDefinitionWorkflow,
)
from src.workflows.crud.schedule_crud import (
    ScheduleControlWorkflow,
    ScheduleCreateWorkflow,
    ScheduleEditWorkflow,
    ScheduleUpdateWorkflow,
)
from src.workflows.crud.task_metrics_crud import (
    GetTaskMetricsWorkflow,
)
from src.workflows.crud.tasks_crud import (
    PlaygroundCreateDualTasksWorkflow,
    TasksCreateWorkflow,
    TasksDeleteWorkflow,
    TasksGetByIdWorkflow,
    TasksGetStatsWorkflow,
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
from src.workflows.feedback_submission import (
    FeedbackSubmissionWorkflow,
    GetDetailedFeedbacksWorkflow,
    GetFeedbackAnalyticsWorkflow,
    GetTaskFeedbackWorkflow,
)
from src.workflows.get_task_traces import GetTaskTracesWorkflow
from src.workflows.retroactive_metrics import (
    RetroactiveMetrics,
)
from src.workflows.task_metrics import TaskMetricsWorkflow
from src.workflows.tasks_by_metrics import (
    GetTasksByFeedbackWorkflow,
    GetTasksByMetricWorkflow,
)

# Create logger for this module
logger = logging.getLogger(__name__)


async def run_restack_service() -> None:
    """Run the Restack service."""
    await client.start_service(
        agents=[AgentTask],
        workflows=[
            AgentsReadWorkflow,
            AgentsReadTableWorkflow,
            AgentsCreateWorkflow,
            AgentsCloneWorkflow,
            AgentsUpdateWorkflow,
            AgentsDeleteWorkflow,
            AgentsArchiveWorkflow,
            AgentsUpdateStatusWorkflow,
            AgentsGetByIdWorkflow,
            AgentsGetByStatusWorkflow,
            AgentsGetVersionsWorkflow,
            TasksReadWorkflow,
            TasksCreateWorkflow,
            TasksUpdateWorkflow,
            TasksDeleteWorkflow,
            TasksGetByIdWorkflow,
            TasksGetStatsWorkflow,
            TasksUpdateAgentTaskIdWorkflow,
            PlaygroundCreateDualTasksWorkflow,
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
            # Datasets workflows
            DatasetsReadWorkflow,
            DatasetsGetByIdWorkflow,
            QueryDatasetEventsWorkflow,
            McpServersReadWorkflow,
            McpServersCreateWorkflow,
            McpServersUpdateWorkflow,
            McpServersDeleteWorkflow,
            McpServersGetByIdWorkflow,
            McpToolsListWorkflow,
            AgentToolsReadByAgentWorkflow,
            AgentToolsReadRecordsByAgentWorkflow,
            AgentToolsCreateWorkflow,
            AgentToolsUpdateWorkflow,
            AgentToolsDeleteWorkflow,
            AgentSubagentsReadWorkflow,
            AgentSubagentsGetAvailableWorkflow,
            AgentSubagentsCreateWorkflow,
            AgentSubagentsDeleteWorkflow,
            AgentSubagentsToggleWorkflow,
            ScheduleCreateWorkflow,
            ScheduleUpdateWorkflow,
            ScheduleEditWorkflow,
            ScheduleControlWorkflow,
            # MCP OAuth SDK workflows (official implementation)
            McpOAuthInitializeWorkflow,
            McpOAuthCallbackWorkflow,
            OAuthTokensGetByWorkspaceWorkflow,
            BearerTokenCreateWorkflow,
            OAuthTokenDeleteWorkflow,
            OAuthTokenRefreshWorkflow,
            OAuthTokenSetDefaultWorkflow,
            OAuthTokenSetDefaultByIdWorkflow,
            # Metrics workflows
            CreateMetricDefinitionWorkflow,
            UpdateMetricDefinitionWorkflow,
            DeleteMetricDefinitionWorkflow,
            ListMetricDefinitionsWorkflow,
            GetTaskMetricsWorkflow,
            GetTaskTracesWorkflow,
            TaskMetricsWorkflow,
            CreateMetricWithRetroactiveWorkflow,
            RetroactiveMetrics,
            # Analytics workflow
            GetAnalyticsMetrics,
            # Feedback workflows
            FeedbackSubmissionWorkflow,
            GetTaskFeedbackWorkflow,
            GetFeedbackAnalyticsWorkflow,
            GetDetailedFeedbacksWorkflow,
            # Tasks filtering workflows
            GetTasksByMetricWorkflow,
            GetTasksByFeedbackWorkflow,
        ],
        functions=[
            send_agent_event,
            subtask_notify,
            llm_response_stream,
            llm_prepare_response,
            agents_read,
            agents_read_table,
            agents_create,
            agents_clone,
            agents_update,
            agents_delete,
            agents_archive,
            agents_get_by_id,
            agents_get_by_status,
            agents_get_versions,
            agents_resolve_by_name,
            agents_update_status,
            tasks_read,
            tasks_create,
            tasks_update,
            tasks_delete,
            tasks_get_by_id,
            tasks_get_by_parent_id,
            tasks_get_stats,
            tasks_update_agent_task_id,
            get_tasks_by_metric_failure,
            get_tasks_by_feedback,
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
            # Datasets functions
            datasets_read,
            datasets_get_by_id,
            query_dataset_events,
            datasets_create,
            # Data ingestion functions
            ingest_pipeline_events,
            query_clickhouse_data,
            mcp_servers_read,
            mcp_servers_create,
            mcp_servers_update,
            mcp_servers_delete,
            mcp_servers_get_by_id,
            # MCP tools functions
            mcp_session_init,
            mcp_tools_list,
            mcp_tools_list_direct,
            # MCP OAuth CRUD functions
            mcp_server_get_by_id,
            oauth_token_create_or_update,
            oauth_token_get_by_user_and_server,
            oauth_token_delete,
            oauth_token_set_default,
            oauth_token_set_default_by_id,
            oauth_tokens_get_by_workspace,
            # MCP OAuth client functions
            oauth_parse_callback,
            oauth_generate_auth_url,
            oauth_exchange_code_for_token,
            oauth_refresh_token,
            # Agent tools functions
            agent_tools_read_by_agent,
            agent_tools_read_records_by_agent,
            agent_tools_create,
            agent_tools_update,
            agent_tools_delete,
            # Agent subagents functions
            agent_subagents_read,
            agent_subagents_create,
            agent_subagents_delete,
            agent_subagents_toggle,
            agent_subagents_get_available,
            get_oauth_token_for_mcp_server,
            # Metrics functions
            create_metric_definition,
            get_metric_definition_by_id,
            update_metric_definition,
            delete_metric_definition,
            list_metric_definitions,
            get_task_metrics_clickhouse,
            get_task_traces_from_clickhouse,
            # Trace query functions
            query_traces_batch,
            query_traces_for_response,
            aggregate_traces_for_task,
            # Analytics function
            get_analytics_metrics,
            evaluate_llm_judge_metric,
            evaluate_python_code_metric,
            evaluate_formula_metric,
            ingest_performance_metrics,
            ingest_quality_metrics,
            # Feedback functions
            ingest_feedback_metric,
            get_task_feedback,
            get_feedback_analytics,
            get_detailed_feedbacks,
        ],
    )


def init_tracing() -> None:
    """Initialize OpenAI Agents tracing with ClickHouse processor.

    Sets up tracing once at startup. Processor runs in background
    with async batching for high-scale parallel use cases.
    """
    try:
        from agents import tracing
        from src.tracing import ClickHouseTracingProcessor

        environment = os.getenv("ENVIRONMENT", "development")

        if environment == "production":
            # Production: High-scale ClickHouse processor
            processor = ClickHouseTracingProcessor(
                batch_size=1000,  # Flush after 1000 spans
                flush_interval_sec=5.0,  # Or every 5 seconds
            )
            tracing.add_trace_processor(processor)
            logger.info(
                "Tracing initialized: ClickHouse (production mode)"
            )
        else:
            # Development: Smaller batches for faster feedback
            processor = ClickHouseTracingProcessor(
                batch_size=10,  # Small batch for dev
                flush_interval_sec=2.0,  # Quick flush
            )
            tracing.add_trace_processor(processor)
            logger.info(
                "Tracing initialized: ClickHouse (development mode)"
            )

    except Exception as e:
        logger.warning("Failed to initialize tracing: %s", e)
        logger.warning("Continuing without tracing...")


async def main() -> None:
    """Main function to run Restack services."""
    # Initialize database
    await init_async_db()
    logger.info("Database initialized")

    # Initialize tracing
    init_tracing()

    logger.info(
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
        logger.info(
            "Services interrupted by user. Exiting gracefully."
        )


def dev_watch() -> None:
    """Development mode with file watching and auto-restart."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    watch_path = Path.cwd()
    logger.info(
        "Watching %s and its subdirectories for changes...",
        watch_path,
    )
    webbrowser.open("http://localhost:5233")
    run_process(watch_path, recursive=True, target=start)


if __name__ == "__main__":
    # Simple direct execution
    start()
