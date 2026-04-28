import asyncio
import logging
import os
import subprocess
import webbrowser
from pathlib import Path

from restack_ai.restack import ServiceOptions
from watchfiles import run_process

from src.agents.agent_task import AgentTask
from src.client import client
from src.constants import TASK_QUEUE, TASK_QUEUE_EMBED
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
    get_restack_core_mcp_server_id_for_agent,
)
from src.functions.agents_crud import (
    agents_clone,
    agents_create,
    agents_delete,
    agents_get_build_agent,
    agents_get_by_id,
    agents_get_by_status,
    agents_get_versions,
    agents_read,
    agents_read_all,
    agents_read_table,
    agents_resolve_by_name,
    agents_update,
    agents_update_status,
)
from src.functions.analytics_metrics import get_analytics_metrics
from src.functions.auth_crud import (
    request_password_reset,
    reset_password,
    user_login,
    user_signup,
)
from src.functions.data_ingestion import (
    ingest_pipeline_events,
    ingest_pipeline_events_cockroachdb,
    query_clickhouse_data,
)
from src.functions.datasets_crud import (
    datasets_create,
    datasets_get_by_id,
    datasets_read,
    datasets_update,
    delete_dataset_events_by_source,
    list_dataset_files,
    query_dataset_events,
)
from src.functions.embed_anything_ingestion import (
    embed_anything_pdf_to_events,
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
    bearer_token_create_or_update,
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
    firecrawl_resolve_url,
    mcp_servers_create,
    mcp_servers_delete,
    mcp_servers_get_by_id,
    mcp_servers_read,
    mcp_servers_update,
    mcp_servers_upsert_by_label,
    phantombuster_resolve_url,
)
from src.functions.mcp_tools_refresh import (
    list_mcp_server_tools,
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
from src.functions.remote_mcp_directory import (
    remote_mcp_directory_read,
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
from src.functions.slack_callback import (
    notify_slack_on_task_complete,
    slack_add_reaction,
    slack_post_message,
    slack_post_task_started,
    slack_remove_reaction,
    slack_update_message,
)
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
    tasks_get_build_session,
    tasks_get_build_summary,
    tasks_get_by_id,
    tasks_get_by_metadata,
    tasks_get_by_parent_id,
    tasks_get_stats,
    tasks_get_view_by_id,
    tasks_list_views_for_dataset,
    tasks_read,
    tasks_save_agent_state,
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
    count_traces_for_retroactive,
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
    AgentsCloneWorkflow,
    AgentsCreateWorkflow,
    AgentsDeleteWorkflow,
    AgentsGetBuildAgentWorkflow,
    AgentsGetByIdWorkflow,
    AgentsGetByStatusWorkflow,
    AgentsGetVersionsWorkflow,
    AgentsReadAllWorkflow,
    AgentsReadTableWorkflow,
    AgentsReadWorkflow,
    AgentsUpdateStatusWorkflow,
    AgentsUpdateWorkflow,
)
from src.workflows.crud.auth_crud import (
    RequestPasswordResetWorkflow,
    ResetPasswordWorkflow,
    UserLoginWorkflow,
    UserSignupWorkflow,
)
from src.workflows.crud.datasets_crud import (
    AddFilesToDatasetWorkflow,
    DatasetsCreateWorkflow,
    DatasetsGetByIdWorkflow,
    DatasetsReadWorkflow,
    DeleteDatasetEventsBySourceWorkflow,
    GetViewWorkflow,
    ListDatasetFilesWorkflow,
    ListViewsForDatasetWorkflow,
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
from src.workflows.crud.remote_mcp_directory import (
    GetRemoteMcpDirectoryWorkflow,
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
    TasksGetBuildSessionWorkflow,
    TasksGetBuildSummaryWorkflow,
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
    """Run the main Restack service."""
    await client.start_service(
        task_queue=TASK_QUEUE,
        agents=[AgentTask],
        workflows=[
            AgentsReadWorkflow,
            AgentsReadAllWorkflow,
            AgentsReadTableWorkflow,
            AgentsCreateWorkflow,
            AgentsCloneWorkflow,
            AgentsUpdateWorkflow,
            AgentsDeleteWorkflow,
            AgentsUpdateStatusWorkflow,
            AgentsGetByIdWorkflow,
            AgentsGetBuildAgentWorkflow,
            AgentsGetByStatusWorkflow,
            AgentsGetVersionsWorkflow,
            TasksReadWorkflow,
            TasksCreateWorkflow,
            TasksUpdateWorkflow,
            TasksDeleteWorkflow,
            TasksGetBuildSessionWorkflow,
            TasksGetBuildSummaryWorkflow,
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
            RequestPasswordResetWorkflow,
            ResetPasswordWorkflow,
            # Datasets workflows
            DatasetsReadWorkflow,
            DatasetsCreateWorkflow,
            DatasetsGetByIdWorkflow,
            QueryDatasetEventsWorkflow,
            ListDatasetFilesWorkflow,
            DeleteDatasetEventsBySourceWorkflow,
            ListViewsForDatasetWorkflow,
            GetViewWorkflow,
            McpServersReadWorkflow,
            McpServersCreateWorkflow,
            McpServersUpdateWorkflow,
            McpServersDeleteWorkflow,
            McpServersGetByIdWorkflow,
            McpToolsListWorkflow,
            GetRemoteMcpDirectoryWorkflow,
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
            slack_post_message,
            slack_post_task_started,
            slack_update_message,
            slack_add_reaction,
            slack_remove_reaction,
            notify_slack_on_task_complete,
            tasks_get_by_metadata,
            llm_response_stream,
            llm_prepare_response,
            agents_read,
            agents_read_all,
            agents_read_table,
            agents_create,
            agents_clone,
            agents_update,
            agents_delete,
            agents_get_build_agent,
            agents_get_by_id,
            agents_get_by_status,
            agents_get_versions,
            agents_resolve_by_name,
            agents_update_status,
            tasks_read,
            tasks_create,
            tasks_update,
            tasks_delete,
            tasks_get_build_session,
            tasks_get_build_summary,
            tasks_get_by_id,
            tasks_get_by_parent_id,
            tasks_get_stats,
            tasks_get_view_by_id,
            tasks_list_views_for_dataset,
            tasks_save_agent_state,
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
            request_password_reset,
            reset_password,
            # Datasets functions
            datasets_read,
            datasets_get_by_id,
            query_dataset_events,
            list_dataset_files,
            delete_dataset_events_by_source,
            datasets_create,
            datasets_update,
            # Data ingestion functions
            ingest_pipeline_events,
            ingest_pipeline_events_cockroachdb,
            query_clickhouse_data,
            mcp_servers_read,
            mcp_servers_create,
            mcp_servers_update,
            mcp_servers_delete,
            mcp_servers_get_by_id,
            mcp_servers_upsert_by_label,
            firecrawl_resolve_url,
            phantombuster_resolve_url,
            remote_mcp_directory_read,
            # MCP tools functions
            mcp_session_init,
            mcp_tools_list,
            mcp_tools_list_direct,
            list_mcp_server_tools,
            # MCP OAuth CRUD functions
            mcp_server_get_by_id,
            bearer_token_create_or_update,
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
            get_restack_core_mcp_server_id_for_agent,
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
            count_traces_for_retroactive,
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


async def run_embed_service() -> None:
    """Run the embedding service (one concurrent run per worker; scale horizontally).

    Memory: subprocess runs in the same container as the worker; parent + child
    share the container limit. Recommend >= 1.5 GiB for the embed worker to avoid OOM.
    """
    await client.start_service(
        task_queue=TASK_QUEUE_EMBED,
        workflows=[AddFilesToDatasetWorkflow],
        functions=[embed_anything_pdf_to_events],
        options=ServiceOptions(
            rate_limit=1,
            max_concurrent_function_runs=1,
        ),
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

    except (ImportError, ModuleNotFoundError) as e:
        logger.info(
            "Tracing SDK not available (install openai-agents for tracing): %s",
            e,
        )
        logger.info("Continuing without tracing...")
    except (
        ValueError,
        TypeError,
        RuntimeError,
        AttributeError,
        ConnectionError,
        OSError,
    ) as e:
        logger.warning("Failed to initialize tracing: %s", e)
        logger.warning("Continuing without tracing...")


def _run_startup_tasks() -> None:
    """Run database migrations before starting services."""
    import sys

    try:
        # Determine scripts directory based on environment
        docker_path = Path("/app/packages/database/scripts")
        # Use absolute path resolution from file location for local dev
        local_path = (
            Path(__file__).resolve().parent.parent.parent.parent
            / "packages"
            / "database"
            / "scripts"
        )

        scripts_dir = (
            docker_path if docker_path.exists() else local_path
        )

        logger.info("Scripts directory: %s", scripts_dir)
        logger.info(
            "Scripts directory exists: %s", scripts_dir.exists()
        )

        # Run migrations
        logger.info("Running database migrations...")
        migrate_script = scripts_dir / "migrate.sh"
        if migrate_script.exists():
            result = subprocess.run(  # noqa: S603
                [str(migrate_script)],
                check=False,
                text=True,
                stdout=sys.stdout,
                stderr=sys.stderr,
            )
            if result.returncode != 0:
                logger.error(
                    "Migration failed: %s", result.stderr
                )
                sys.exit(1)
            logger.info(
                "Database migrations completed successfully"
            )
        else:
            logger.warning(
                "Migration script not found: %s", migrate_script
            )

        # Handle admin workspace seed (admin user, build agent, template agents)
        admin_seed = (
            os.getenv("ADMIN_SEED", "false").lower() == "true"
        )
        if admin_seed:
            logger.info("Inserting admin workspace data...")
            insert_script = scripts_dir / "insert-admin.sh"
            if insert_script.exists():
                result = subprocess.run(  # noqa: S603
                    [str(insert_script)],
                    check=False,
                    capture_output=True,
                    text=True,
                )
                if result.returncode != 0:
                    logger.error(
                        "Admin seed failed: %s", result.stderr
                    )
                    sys.exit(1)
                logger.info(
                    "Admin workspace data inserted successfully"
                )
            else:
                logger.warning(
                    "Admin insert script not found: %s",
                    insert_script,
                )

    except Exception:
        logger.exception("Unexpected error in startup tasks")
        sys.exit(1)


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
    await asyncio.gather(
        run_restack_service(), run_embed_service()
    )


def start() -> None:
    """Start Restack services (production mode)."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Run database migrations before starting services
    _run_startup_tasks()

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
