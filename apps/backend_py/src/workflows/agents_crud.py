from datetime import timedelta
from typing import List, Optional, Dict, Any

from pydantic import BaseModel
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)

with import_functions():
    from src.functions.agents_crud import (
        agents_read, agents_create, agents_update, agents_delete, AgentCreateInput,
        agents_get_by_id, agents_get_by_status, agents_get_versions, AgentIdInput, AgentUpdateInput,
        AgentGetByStatusInput, AgentGetVersionsInput, AgentOutput, AgentListOutput, AgentSingleOutput, AgentDeleteOutput
    )


# Workflow definitions
@workflow.defn()
class AgentsReadWorkflow:
    """Workflow to read all agents"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> AgentListOutput:
        log.info("AgentsReadWorkflow started")
        try:
            result = await workflow.step(
                function=agents_read,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agents_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class AgentsCreateWorkflow:
    """Workflow to create a new agent"""
    
    @workflow.run
    async def run(self, workflow_input: AgentCreateInput) -> AgentSingleOutput:
        log.info("AgentsCreateWorkflow started")
        try:
            result = await workflow.step(
                function=agents_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agents_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class AgentsUpdateWorkflow:
    """Workflow to update an existing agent"""
    
    @workflow.run
    async def run(self, workflow_input: AgentUpdateInput) -> AgentSingleOutput:
        log.info("AgentsUpdateWorkflow started")
        try:
            result = await workflow.step(
                function=agents_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agents_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class AgentsDeleteWorkflow:
    """Workflow to delete an agent"""
    
    @workflow.run
    async def run(self, workflow_input: AgentIdInput) -> AgentDeleteOutput:
        log.info("AgentsDeleteWorkflow started")
        try:
            result = await workflow.step(
                function=agents_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agents_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class AgentsGetByIdWorkflow:
    """Workflow to get a specific agent by ID"""
    
    @workflow.run
    async def run(self, workflow_input: AgentIdInput) -> AgentSingleOutput:
        log.info("AgentsGetByIdWorkflow started")
        try:
            result = await workflow.step(
                function=agents_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agents_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class AgentsGetByStatusWorkflow:
    """Workflow to get agents by status"""
    
    @workflow.run
    async def run(self, workflow_input: AgentGetByStatusInput) -> AgentListOutput:
        log.info("AgentsGetByStatusWorkflow started")
        try:
            result = await workflow.step(
                function=agents_get_by_status,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agents_get_by_status: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class AgentsGetVersionsWorkflow:
    """Workflow to get all versions of an agent by parent_agent_id"""
    
    @workflow.run
    async def run(self, workflow_input: AgentGetVersionsInput) -> AgentListOutput:
        log.info("AgentsGetVersionsWorkflow started")
        try:
            result = await workflow.step(
                function=agents_get_versions,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during agents_get_versions: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)
