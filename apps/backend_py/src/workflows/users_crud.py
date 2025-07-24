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
    from src.functions.users_crud import (
        users_read, users_create, users_update, users_delete,
        users_get_by_id, users_get_by_email, users_get_by_workspace,
        UserCreateInput, UserUpdateInput,
        UserListOutput, UserSingleOutput
    )


# Workflow definitions
@workflow.defn()
class UsersReadWorkflow:
    """Workflow to read all users"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> UserListOutput:
        log.info("UsersReadWorkflow started")
        try:
            result = await workflow.step(
                function=users_read,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during users_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UsersCreateWorkflow:
    """Workflow to create a new user"""
    
    @workflow.run
    async def run(self, workflow_input: UserCreateInput) -> UserSingleOutput:
        log.info("UsersCreateWorkflow started")
        try:
            result = await workflow.step(
                function=users_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during users_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UsersUpdateWorkflow:
    """Workflow to update an existing user"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> UserSingleOutput:
        log.info("UsersUpdateWorkflow started")
        try:
            result = await workflow.step(
                function=users_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during users_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UsersDeleteWorkflow:
    """Workflow to delete a user"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> Dict[str, bool]:
        log.info("UsersDeleteWorkflow started")
        try:
            result = await workflow.step(
                function=users_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during users_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UsersGetByIdWorkflow:
    """Workflow to get a specific user by ID"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> Optional[UserSingleOutput]:
        log.info("UsersGetByIdWorkflow started")
        try:
            result = await workflow.step(
                function=users_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during users_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UsersGetByEmailWorkflow:
    """Workflow to get a specific user by email"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> Optional[UserSingleOutput]:
        log.info("UsersGetByEmailWorkflow started")
        try:
            result = await workflow.step(
                function=users_get_by_email,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during users_get_by_email: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UsersGetByWorkspaceWorkflow:
    """Workflow to get all users in a workspace"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> UserListOutput:
        log.info("UsersGetByWorkspaceWorkflow started")
        try:
            result = await workflow.step(
                function=users_get_by_workspace,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during users_get_by_workspace: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) 