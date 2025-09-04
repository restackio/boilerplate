from datetime import timedelta

from pydantic import BaseModel, Field
from restack_ai.workflow import (
    NonRetryableError,
    import_functions,
    log,
    workflow,
)


class HelloWorldInput(BaseModel):
    """Input for generating a hello world response."""

    name: str = Field(
        default="World",
        description="Name to greet in the hello message",
    )
    min_number: int = Field(
        default=1, description="Minimum value for random number"
    )
    max_number: int = Field(
        default=1000,
        description="Maximum value for random number",
    )


class HelloWorldOutput(BaseModel):
    """Output containing hello world message and random number."""

    message: str
    random_number: int
    timestamp: str


# Import the function using the proper Restack pattern
with import_functions():
    from src.functions.generate_random_data import (
        RandomDataInput,
        generate_random_data,
    )


@workflow.defn(
    description="Generate a hello world message with random number"
)
class HelloWorld:
    """Simple hello world tool that returns a greeting with a random number."""

    @workflow.run
    async def run(
        self, workflow_input: HelloWorldInput
    ) -> HelloWorldOutput:
        log.info("HelloWorld started", input=workflow_input)

        try:
            # Generate random data using function (non-deterministic operations)
            random_data = await workflow.step(
                task_queue="mcp_server",
                function=generate_random_data,
                function_input=RandomDataInput(
                    min_number=workflow_input.min_number,
                    max_number=workflow_input.max_number,
                ),
                start_to_close_timeout=timedelta(seconds=10),
            )

            # Create greeting message (deterministic operation)
            greeting_message = f"Hello, {workflow_input.name}!"

            return HelloWorldOutput(
                message=greeting_message,
                random_number=random_data.random_number,
                timestamp=random_data.timestamp,
            )

        except Exception as e:
            error_message = f"Error during HelloWorld: {e}"
            log.error(error_message)
            raise NonRetryableError(message=error_message) from e
