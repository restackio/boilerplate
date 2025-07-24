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
    from src.functions.user_workspaces_crud import (
        user_workspaces_get_by_user, user_workspaces_get_by_workspace,
        user_workspaces_create, user_workspaces_update, user_workspaces_delete,
        UserWorkspacesGetByUserInput, UserWorkspacesGetByWorkspaceInput,
        UserWorkspaceCreateInput, UserWorkspaceUpdateInput, UserWorkspaceDeleteInput
    )


# Workflow definitions
@workflow.defn()
class UserWorkspacesGetByUserWorkflow:
    """Workflow to get all workspaces for a user"""
    
    @workflow.run
    async def run(self, workflow_input: UserWorkspacesGetByUserInput):
        log.info("UserWorkspacesGetByUserWorkflow started")
        try:
            result = await workflow.step(
                function=user_workspaces_get_by_user,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during user_workspaces_get_by_user: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UserWorkspacesGetByWorkspaceWorkflow:
    """Workflow to get all users for a workspace"""
    
    @workflow.run
    async def run(self, workflow_input: UserWorkspacesGetByWorkspaceInput):
        log.info("UserWorkspacesGetByWorkspaceWorkflow started")
        try:
            result = await workflow.step(
                function=user_workspaces_get_by_workspace,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during user_workspaces_get_by_workspace: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UserWorkspacesCreateWorkflow:
    """Workflow to add a user to a workspace"""
    
    @workflow.run
    async def run(self, workflow_input: UserWorkspaceCreateInput):
        log.info("UserWorkspacesCreateWorkflow started")
        try:
            result = await workflow.step(
                function=user_workspaces_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during user_workspaces_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UserWorkspacesUpdateWorkflow:
    """Workflow to update user role in workspace"""
    
    @workflow.run
    async def run(self, workflow_input: UserWorkspaceUpdateInput):
        log.info("UserWorkspacesUpdateWorkflow started")
        try:
            result = await workflow.step(
                function=user_workspaces_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during user_workspaces_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UserWorkspacesDeleteWorkflow:
    """Workflow to remove a user from a workspace"""
    
    @workflow.run
    async def run(self, workflow_input: UserWorkspaceDeleteInput):
        log.info("UserWorkspacesDeleteWorkflow started")
        try:
            result = await workflow.step(
                function=user_workspaces_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during user_workspaces_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) 