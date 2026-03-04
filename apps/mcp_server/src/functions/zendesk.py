from pydantic import BaseModel
from restack_ai.function import NonRetryableError, function

class SearchTicketsInput(BaseModel):
    query: str

class TicketResult(BaseModel):
    id: str
    subject: str
    status: str


@function.defn()
async def search_zendesk_tickets(input: SearchTicketsInput) -> list[TicketResult]:
    """Search Zendesk tickets by query"""
    # Mock implementation included for demo
    return [
        TicketResult(id="12345", subject="Login issues", status="open"),
        TicketResult(id="12346", subject="Mobile app crash", status="pending")
    ]
