import asyncio
import logging
import webbrowser
from pathlib import Path

from watchfiles import run_process

from src.agents.agent_task import AgentTask
from src.client import client
from src.functions.get_random import get_random
from src.functions.get_result import get_result
from src.functions.llm_chat import llm_chat
from src.functions.todo_create import todo_create
from src.functions.agents_crud import (
    agents_read, agents_create, agents_update, agents_delete, 
    agents_get_by_id, agents_get_by_status, agents_get_versions
)
from src.functions.tasks_crud import (
    tasks_read, tasks_create, tasks_update, tasks_delete,
    tasks_get_by_id
)
from src.workflows.todo_execute import TodoExecute
from src.workflows.agents_crud import (
    AgentsReadWorkflow, AgentsCreateWorkflow, AgentsUpdateWorkflow,
    AgentsDeleteWorkflow, AgentsGetByIdWorkflow, AgentsGetByStatusWorkflow,
    AgentsGetVersionsWorkflow,
)
from src.workflows.tasks_crud import (
    TasksReadWorkflow, TasksCreateWorkflow, TasksUpdateWorkflow,
    TasksDeleteWorkflow, TasksGetByIdWorkflow
)
from src.database.connection import init_db


async def main() -> None:
    # Initialize database
    init_db()
    logging.info("Database initialized")
    
    await client.start_service(
        agents=[AgentTask],
        workflows=[
            TodoExecute,
            AgentsReadWorkflow, AgentsCreateWorkflow, AgentsUpdateWorkflow,
            AgentsDeleteWorkflow, AgentsGetByIdWorkflow, AgentsGetByStatusWorkflow,
            AgentsGetVersionsWorkflow,
            TasksReadWorkflow, TasksCreateWorkflow, TasksUpdateWorkflow,
            TasksDeleteWorkflow, TasksGetByIdWorkflow,
        ],
        functions=[
            todo_create, get_random, get_result, llm_chat,
            agents_read, agents_create, agents_update, agents_delete,
            agents_get_by_id, agents_get_by_status, agents_get_versions,
            tasks_read, tasks_create, tasks_update, tasks_delete,
            tasks_get_by_id,
        ],
    )


def run_services() -> None:
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Service interrupted by user. Exiting gracefully.")


def watch_services() -> None:
    watch_path = Path.cwd()
    logging.info("Watching %s and its subdirectories for changes...", watch_path)
    webbrowser.open("http://localhost:5233")
    run_process(watch_path, recursive=True, target=run_services)


if __name__ == "__main__":
    run_services()
