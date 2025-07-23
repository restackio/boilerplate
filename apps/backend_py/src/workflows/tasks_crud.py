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
    from src.functions.tasks_crud import (
        tasks_read, tasks_create, tasks_update, tasks_delete,
        tasks_get_by_id, tasks_get_by_status, TaskCreateInput, TaskUpdateInput, TaskGetByIdInput,
        TaskGetByStatusInput, TaskOutput, TaskListOutput, TaskSingleOutput, TaskDeleteOutput
    )


# Workflow definitions
@workflow.defn()
class TasksReadWorkflow:
    """Workflow to read all tasks"""
    
    @workflow.run
    async def run(self, workflow_input: dict) -> TaskListOutput:
        log.info("TasksReadWorkflow started")
        try:
            result = await workflow.step(
                function=tasks_read,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during tasks_read: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class TasksCreateWorkflow:
    """Workflow to create a new task"""
    
    @workflow.run
    async def run(self, workflow_input: TaskCreateInput) -> TaskSingleOutput:
        log.info("TasksCreateWorkflow started")
        try:
            result = await workflow.step(
                function=tasks_create,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during tasks_create: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class TasksUpdateWorkflow:
    """Workflow to update an existing task"""
    
    @workflow.run
    async def run(self, workflow_input: TaskUpdateInput) -> TaskSingleOutput:
        log.info("TasksUpdateWorkflow started")
        try:
            result = await workflow.step(
                function=tasks_update,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during tasks_update: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class TasksDeleteWorkflow:
    """Workflow to delete a task"""
    
    @workflow.run
    async def run(self, workflow_input: TaskGetByIdInput) -> TaskDeleteOutput:
        log.info("TasksDeleteWorkflow started")
        try:
            result = await workflow.step(
                function=tasks_delete,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during tasks_delete: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class TasksGetByIdWorkflow:
    """Workflow to get a specific task by ID"""
    
    @workflow.run
    async def run(self, workflow_input: TaskGetByIdInput) -> TaskSingleOutput:
        log.info("TasksGetByIdWorkflow started")
        try:
            result = await workflow.step(
                function=tasks_get_by_id,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during tasks_get_by_id: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class TasksGetByStatusWorkflow:
    """Workflow to get tasks by status"""
    
    @workflow.run
    async def run(self, workflow_input: TaskGetByStatusInput) -> TaskListOutput:
        log.info("TasksGetByStatusWorkflow started")
        try:
            result = await workflow.step(
                function=tasks_get_by_status,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during tasks_get_by_status: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)