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
    from src.functions.workspaces_crud import (
        workspaces_read, workspaces_create, workspaces_update, workspaces_delete,
        workspaces_get_by_id,
        WorkspaceCreateInput, WorkspaceUpdateInput, WorkspaceReadInput,
        WorkspaceListOutput, WorkspaceSingleOutput
    )


# Workflow definitions
@workflow.defn()
class WorkspacesReadWorkflow:
    """Workflow to read workspaces with optional user filtering"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> WorkspaceListOutput:
        log.info("WorkspacesReadWorkflow started")
        try:
            result = await workflow.step(
                function=workspaces_read,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during workspaces_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class WorkspacesCreateWorkflow:
    """Workflow to create a new workspace"""
    
    @workflow.run
    async def run(self, workflow_input: WorkspaceCreateInput) -> WorkspaceSingleOutput:
        log.info("WorkspacesCreateWorkflow started")
        try:
            result = await workflow.step(
                function=workspaces_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during workspaces_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class WorkspacesUpdateWorkflow:
    """Workflow to update an existing workspace"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> WorkspaceSingleOutput:
        log.info("WorkspacesUpdateWorkflow started")
        try:
            result = await workflow.step(
                function=workspaces_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during workspaces_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class WorkspacesDeleteWorkflow:
    """Workflow to delete a workspace"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> Dict[str, bool]:
        log.info("WorkspacesDeleteWorkflow started")
        try:
            result = await workflow.step(
                function=workspaces_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during workspaces_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class WorkspacesGetByIdWorkflow:
    """Workflow to get a specific workspace by ID"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> Optional[WorkspaceSingleOutput]:
        log.info("WorkspacesGetByIdWorkflow started")
        try:
            result = await workflow.step(
                function=workspaces_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during workspaces_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) 