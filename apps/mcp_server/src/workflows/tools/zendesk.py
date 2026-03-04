from restack_ai.workflow import (workflow, import_functions, NonRetryableError, log)
from datetime import timedelta

with import_functions():
    from src.functions.zendesk import (
       SearchTicketsInput,
       TicketResult,
       search_zendesk_tickets
    )

@workflow.defn()
class SearchZendeskTicketsWorkflow:
    @workflow.run
    async def run(self, input: SearchTicketsInput) -> list[TicketResult]:
      try:
        return await workflow.step(
            task_queue="mcp_server",
            function=search_zendesk_tickets,
            function_input=input,
            start_to_close_timeout=timedelta(seconds=30),
        )
      except Exception as e:
        error_message = f"Error during search_zendesk_tickets: {e}"
        log.error(error_message)
        raise NonRetryableError(message=error_message) from e
