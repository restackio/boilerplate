"""Centralized pricing configuration for all OpenAI models.

Based on pricing table: https://openai.com/api/pricing/
All prices are in USD per 1M tokens.
"""

from typing import NamedTuple


class ModelPricing(NamedTuple):
    """Model pricing structure."""

    input_price: float  # Price per 1M tokens
    cached_input_price: float  # Price per 1M tokens
    output_price: float  # Price per 1M tokens


# Pricing table - all prices per 1M tokens
MODEL_PRICING = {
    # GPT-5 Family
    "gpt-5": ModelPricing(1.25, 0.125, 10.00),
    "gpt-5-mini": ModelPricing(0.25, 0.025, 2.00),
    "gpt-5-nano": ModelPricing(0.05, 0.005, 0.40),
    "gpt-5-chat-latest": ModelPricing(1.25, 0.125, 10.00),
    "gpt-5-codex": ModelPricing(1.25, 0.125, 10.00),
    "gpt-5-pro": ModelPricing(15.00, 0.0, 120.00),
    # GPT-5 with date suffix
    "gpt-5-2025-08-07": ModelPricing(1.25, 0.125, 10.00),
    "gpt-5-mini-2025-08-07": ModelPricing(0.25, 0.025, 2.00),
    "gpt-5-nano-2025-08-07": ModelPricing(0.05, 0.005, 0.40),
    # GPT-4.1 Family
    "gpt-4.1": ModelPricing(2.00, 0.50, 8.00),
    "gpt-4.1-mini": ModelPricing(0.40, 0.10, 1.60),
    "gpt-4.1-nano": ModelPricing(0.10, 0.025, 0.40),
    # GPT-4o Family
    "gpt-4o": ModelPricing(2.50, 1.25, 10.00),
    "gpt-4o-2024-05-13": ModelPricing(5.00, 0.0, 15.00),
    "gpt-4o-mini": ModelPricing(0.15, 0.075, 0.60),
    # Realtime Models
    "gpt-realtime": ModelPricing(4.00, 0.40, 16.00),
    "gpt-realtime-mini": ModelPricing(0.60, 0.06, 2.40),
    "gpt-4o-realtime-preview": ModelPricing(5.00, 2.50, 20.00),
    "gpt-4o-mini-realtime-preview": ModelPricing(
        0.60, 0.30, 2.40
    ),
    # Audio Models
    "gpt-audio": ModelPricing(2.50, 0.0, 10.00),
    "gpt-audio-mini": ModelPricing(0.60, 0.0, 2.40),
    "gpt-4o-audio-preview": ModelPricing(2.50, 0.0, 10.00),
    "gpt-4o-mini-audio-preview": ModelPricing(0.15, 0.0, 0.60),
    # Reasoning Models (O-series)
    "o1": ModelPricing(15.00, 7.50, 60.00),
    "o1-pro": ModelPricing(150.00, 0.0, 600.00),
    "o3-pro": ModelPricing(20.00, 0.0, 80.00),
    "o3": ModelPricing(2.00, 0.50, 8.00),
    "o3-deep-research": ModelPricing(10.00, 2.50, 40.00),
    "o4-mini": ModelPricing(1.10, 0.275, 4.40),
    "o4-mini-deep-research": ModelPricing(2.00, 0.50, 8.00),
    "o3-mini": ModelPricing(1.10, 0.55, 4.40),
    "o1-mini": ModelPricing(1.10, 0.55, 4.40),
    # Codex Models
    "codex-mini-latest": ModelPricing(1.50, 0.375, 6.00),
    # Search Models
    "gpt-4o-mini-search-preview": ModelPricing(0.15, 0.0, 0.60),
    "gpt-4o-search-preview": ModelPricing(2.50, 0.0, 10.00),
    # Computer Use
    "computer-use-preview": ModelPricing(3.00, 0.0, 12.00),
    # Image Models
    "gpt-image-1": ModelPricing(5.00, 1.25, 0.0),
    "gpt-image-1-mini": ModelPricing(2.00, 0.20, 0.0),
}

# Default pricing (GPT-5)
DEFAULT_PRICING = MODEL_PRICING["gpt-5"]


def get_model_pricing(model_name: str | None) -> ModelPricing:
    """Get pricing for a specific model.

    Args:
        model_name: The model name (e.g., "gpt-5", "gpt-4o-mini")

    Returns:
        ModelPricing tuple with (input_price, cached_input_price, output_price)
        Returns default GPT-5 pricing if model not found.
    """
    if not model_name:
        return DEFAULT_PRICING

    # Try exact match first
    if model_name in MODEL_PRICING:
        return MODEL_PRICING[model_name]

    # Try lowercase match
    model_name_lower = model_name.lower()
    if model_name_lower in MODEL_PRICING:
        return MODEL_PRICING[model_name_lower]

    # Default to GPT-5 pricing if model not found
    return DEFAULT_PRICING


def calculate_cost(
    input_tokens: int,
    output_tokens: int,
    model_name: str | None = None,
    *,
    use_cached: bool = False,
) -> float:
    """Calculate cost based on token usage and model.

    Args:
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        model_name: Model name (defaults to GPT-5 if not provided)
        use_cached: Whether to use cached input pricing (default: False)

    Returns:
        Cost in USD
    """
    pricing = get_model_pricing(model_name)

    input_price = (
        pricing.cached_input_price
        if use_cached
        else pricing.input_price
    )

    # Calculate cost: (tokens / 1M) * price_per_1M
    return (input_tokens * input_price / 1_000_000) + (
        output_tokens * pricing.output_price / 1_000_000
    )
