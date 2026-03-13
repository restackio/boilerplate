from datetime import timedelta

from restack_ai.workflow import (
    NonRetryableError,
    RetryPolicy,
    import_functions,
    log,
    workflow,
)

from src.constants import TASK_QUEUE

with import_functions():
    from src.functions.auth_crud import (
        AuthOutput,
        RequestPasswordResetInput,
        RequestPasswordResetOutput,
        ResetPasswordInput,
        ResetPasswordOutput,
        UserLoginInput,
        UserSignupInput,
        request_password_reset,
        reset_password,
        user_login,
        user_signup,
    )


# Workflow definitions
@workflow.defn()
class UserSignupWorkflow:
    """Workflow to sign up a new user."""

    @workflow.run
    async def run(
        self, workflow_input: UserSignupInput
    ) -> AuthOutput:
        log.info("UserSignupWorkflow started")
        try:
            return await workflow.step(
                function=user_signup,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )

        except Exception as e:
            error_message = f"Error during user_signup: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class UserLoginWorkflow:
    """Workflow to log in a user."""

    @workflow.run
    async def run(
        self, workflow_input: UserLoginInput
    ) -> AuthOutput:
        log.info("UserLoginWorkflow started")
        try:
            return await workflow.step(
                function=user_login,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=RetryPolicy(
                    maximum_attempts=1,
                    initial_interval=timedelta(seconds=1),
                    maximum_interval=timedelta(seconds=10),
                    backoff_coefficient=2.0,
                ),
            )

        except Exception as e:
            error_message = f"Error during user_login: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class RequestPasswordResetWorkflow:
    """Workflow to request a password reset email/link for the given email."""

    @workflow.run
    async def run(
        self, workflow_input: RequestPasswordResetInput
    ) -> RequestPasswordResetOutput:
        log.info("RequestPasswordResetWorkflow started")
        try:
            return await workflow.step(
                function=request_password_reset,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during request_password_reset: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e


@workflow.defn()
class ResetPasswordWorkflow:
    """Workflow to reset password using a valid reset token."""

    @workflow.run
    async def run(
        self, workflow_input: ResetPasswordInput
    ) -> ResetPasswordOutput:
        log.info("ResetPasswordWorkflow started")
        try:
            return await workflow.step(
                function=reset_password,
                function_input=workflow_input,
                task_queue=TASK_QUEUE,
                start_to_close_timeout=timedelta(seconds=30),
            )
        except Exception as e:
            error_message = f"Error during reset_password: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
