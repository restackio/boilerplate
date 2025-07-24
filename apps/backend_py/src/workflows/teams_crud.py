from datetime import timedelta
from typing import List, Optional, Dict, Any

from pydantic import BaseModel
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow
)

with import_functions():
    from src.functions.teams_crud import (
        teams_read, teams_create, teams_update, teams_delete, teams_get_by_id,
        TeamGetByWorkspaceInput, TeamCreateInput, TeamUpdateInput, TeamIdInput
    )


# Workflow definitions
@workflow.defn()
class TeamsReadWorkflow:
    """Workflow to read all teams for a workspace"""
    
    @workflow.run
    async def run(self, workflow_input: TeamGetByWorkspaceInput):
        log.info("TeamsReadWorkflow started")
        try:
            result = await workflow.step(
                function=teams_read,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during teams_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class TeamsCreateWorkflow:
    """Workflow to create a new team"""
    
    @workflow.run
    async def run(self, workflow_input: TeamCreateInput):
        log.info("TeamsCreateWorkflow started")
        try:
            result = await workflow.step(
                function=teams_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during teams_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class TeamsUpdateWorkflow:
    """Workflow to update an existing team"""
    
    @workflow.run
    async def run(self, workflow_input: TeamUpdateInput):
        log.info("TeamsUpdateWorkflow started")
        try:
            result = await workflow.step(
                function=teams_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during teams_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class TeamsDeleteWorkflow:
    """Workflow to delete a team"""
    
    @workflow.run
    async def run(self, workflow_input: TeamIdInput):
        log.info("TeamsDeleteWorkflow started")
        try:
            result = await workflow.step(
                function=teams_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during teams_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class TeamsGetByIdWorkflow:
    """Workflow to get a team by ID"""
    
    @workflow.run
    async def run(self, workflow_input: TeamIdInput):
        log.info("TeamsGetByIdWorkflow started")
        try:
            result = await workflow.step(
                function=teams_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during teams_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) 