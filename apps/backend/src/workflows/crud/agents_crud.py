from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.agent_tools_crud import (
        AgentToolCreateInput,
        agent_tools_create,
    )
    from src.functions.agents_crud import (
        AgentArchiveInput,
        AgentArchiveOutput,
        AgentCloneInput,
        AgentCreateInput,
        AgentDeleteOutput,
        AgentGetByStatusInput,
        AgentGetByWorkspaceInput,
        AgentGetVersionsInput,
        AgentIdInput,
        AgentListOutput,
        AgentSingleOutput,
        AgentTableListOutput,
        AgentUpdateInput,
        AgentUpdateStatusInput,
        AgentUpdateStatusOutput,
        agents_archive,
        agents_clone,
        agents_create,
        agents_delete,
        agents_get_by_id,
        agents_get_by_status,
        agents_get_versions,
        agents_read,
        agents_read_table,
        agents_update,
        agents_update_status,
    )


# Workflow definitions
@workflow.defn()
class AgentsReadWorkflow:
    """Workflow to read all agents."""

    @workflow.run
    async def run(
        self, workflow_input: AgentGetByWorkspaceInput
    ) -> AgentListOutput:
        log.info("AgentsReadWorkflow started")
        try:
            return await workflow.step(
                function=agents_read,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during agents_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentsCreateWorkflow:
    """Workflow to create a new agent."""

    @workflow.run
    async def run(
        self, workflow_input: AgentCreateInput
    ) -> AgentSingleOutput:
        log.info("AgentsCreateWorkflow started")
        try:
            # Create the agent first
            agent_result = await workflow.step(
                function=agents_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

            # If this is a pipeline agent, automatically add the required tools
            if (
                workflow_input.type == "pipeline"
                and agent_result.agent
            ):
                log.info(
                    "Adding pipeline tools for new pipeline agent"
                )

                # MCP server ID for the pipeline tools (from database seed)
                mcp_server_id = (
                    "c0000000-0000-0000-0000-000000000001"
                )

                # Define the pipeline tools to add
                pipeline_tools = [
                    {
                        "tool_name": "generatemock",
                        "custom_description": "Extract data using mock generation (Step 1: Extract)",
                    },
                    {
                        "tool_name": "transformdata",
                        "custom_description": "Transform data using AI analysis (Step 2: Transform)",
                    },
                    {
                        "tool_name": "loadintodataset",
                        "custom_description": "Load enriched data to dataset (Step 3: Load)",
                    },
                ]

                # Create each tool
                for tool_config in pipeline_tools:
                    try:
                        await workflow.step(
                            function=agent_tools_create,
                            function_input=AgentToolCreateInput(
                                agent_id=agent_result.agent.id,
                                tool_type="mcp",
                                mcp_server_id=mcp_server_id,
                                tool_name=tool_config[
                                    "tool_name"
                                ],
                                custom_description=tool_config[
                                    "custom_description"
                                ],
                                require_approval=False,
                                enabled=True,
                            ),
                            start_to_close_timeout=timedelta(
                                seconds=30
                            ),
                        )
                        log.info(
                            f"Added pipeline tool: {tool_config['tool_name']}"
                        )
                    except (
                        ValueError,
                        TypeError,
                        KeyError,
                    ) as tool_error:
                        log.error(
                            f"Failed to add pipeline tool {tool_config['tool_name']}: {tool_error}"
                        )
                        # Continue adding other tools even if one fails

        except (ValueError, TypeError, ConnectionError) as e:
            error_message = f"Error during agents_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
        else:
            return agent_result


@workflow.defn()
class AgentsUpdateWorkflow:
    """Workflow to update an existing agent."""

    @workflow.run
    async def run(
        self, workflow_input: AgentUpdateInput
    ) -> AgentSingleOutput:
        log.info("AgentsUpdateWorkflow started")
        try:
            return await workflow.step(
                function=agents_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during agents_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentsDeleteWorkflow:
    """Workflow to delete an agent."""

    @workflow.run
    async def run(
        self, workflow_input: AgentIdInput
    ) -> AgentDeleteOutput:
        log.info("AgentsDeleteWorkflow started")
        try:
            return await workflow.step(
                function=agents_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during agents_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentsGetByIdWorkflow:
    """Workflow to get a specific agent by ID."""

    @workflow.run
    async def run(
        self, workflow_input: AgentIdInput
    ) -> AgentSingleOutput:
        log.info("AgentsGetByIdWorkflow started")
        try:
            return await workflow.step(
                function=agents_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during agents_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentsGetByStatusWorkflow:
    """Workflow to get agents by status."""

    @workflow.run
    async def run(
        self, workflow_input: AgentGetByStatusInput
    ) -> AgentListOutput:
        log.info("AgentsGetByStatusWorkflow started")
        try:
            return await workflow.step(
                function=agents_get_by_status,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during agents_get_by_status: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentsGetVersionsWorkflow:
    """Workflow to get all versions of an agent by parent_agent_id."""

    @workflow.run
    async def run(
        self, workflow_input: AgentGetVersionsInput
    ) -> AgentListOutput:
        log.info("AgentsGetVersionsWorkflow started")
        try:
            return await workflow.step(
                function=agents_get_versions,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during agents_get_versions: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentsReadTableWorkflow:
    """Workflow to read all agents with enhanced table data."""

    @workflow.run
    async def run(
        self, workflow_input: AgentGetByWorkspaceInput
    ) -> AgentTableListOutput:
        """Read all agents with enhanced table data."""
        try:
            return await workflow.step(
                function=agents_read_table,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during agents_read_table: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentsArchiveWorkflow:
    """Workflow to archive an agent."""

    @workflow.run
    async def run(
        self, workflow_input: AgentArchiveInput
    ) -> AgentArchiveOutput:
        """Archive an agent."""
        try:
            return await workflow.step(
                function=agents_archive,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during agents_archive: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentsUpdateStatusWorkflow:
    """Workflow to update agent status (publish, archive, draft)."""

    @workflow.run
    async def run(
        self, workflow_input: AgentUpdateStatusInput
    ) -> AgentUpdateStatusOutput:
        """Update agent status."""
        try:
            return await workflow.step(
                function=agents_update_status,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = (
                f"Error during agents_update_status: {e}"
            )
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class AgentsCloneWorkflow:
    """Workflow to clone an agent with all its tools."""

    @workflow.run
    async def run(
        self, workflow_input: AgentCloneInput
    ) -> AgentSingleOutput:
        log.info("AgentsCloneWorkflow started")
        try:
            return await workflow.step(
                function=agents_clone,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(
                    seconds=60
                ),  # Longer timeout for cloning
            )

        except Exception as e:
            error_message = f"Error during agents_clone: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
