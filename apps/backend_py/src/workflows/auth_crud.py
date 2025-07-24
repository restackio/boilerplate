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
    from src.functions.auth_crud import (
        user_signup, user_login,
        UserSignupInput, UserLoginInput, AuthOutput
    )


# Workflow definitions
@workflow.defn()
class UserSignupWorkflow:
    """Workflow to sign up a new user"""
    
    @workflow.run
    async def run(self, workflow_input: UserSignupInput) -> AuthOutput:
        log.info("UserSignupWorkflow started")
        try:
            result = await workflow.step(
                function=user_signup,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during user_signup: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)


@workflow.defn()
class UserLoginWorkflow:
    """Workflow to log in a user"""
    
    @workflow.run
    async def run(self, workflow_input: UserLoginInput) -> AuthOutput:
        log.info("UserLoginWorkflow started")
        try:
            result = await workflow.step(
                function=user_login,
                function_input=workflow_input,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            return result
        except Exception as e:
            error_message = f"Error during user_login: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message)