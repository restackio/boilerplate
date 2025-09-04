import random
from datetime import datetime

from pydantic import BaseModel
from restack_ai.function import function


class RandomDataInput(BaseModel):
    """Input for generating random data."""
    min_number: int
    max_number: int


class RandomDataOutput(BaseModel):
    """Output containing random data."""
    random_number: int
    timestamp: str


@function.defn
async def generate_random_data(input_data: RandomDataInput) -> RandomDataOutput:
    """Generate random number and timestamp - this is a function for non-deterministic operations."""
    random_num = random.randint(input_data.min_number, input_data.max_number)
    current_time = datetime.now().isoformat()

    return RandomDataOutput(
        random_number=random_num,
        timestamp=current_time
    )
