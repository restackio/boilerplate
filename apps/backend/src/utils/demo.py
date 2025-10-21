"""Demo data utilities for showcasing the platform with realistic numbers."""

import os

# Demo multiplier from environment variable (defaults to 0 for real numbers only)
DEMO_MULTIPLIER = int(os.getenv("DEMO_MULTIPLIER", "0"))

# Base demo numbers to multiply (representative baseline)
DEMO_BASE_TASKS = {
    "in_progress": 216,
    "in_review": 45,
    "closed": 234,
    "completed": 567,
}

DEMO_BASE_ANALYTICS = {
    "task_count": 100,
    "feedback_count": 25,
    "positive_feedback": 20,
    "negative_feedback": 5,
    "quality_evaluations": 80,  # ~80% of tasks get quality evaluations
}


def apply_demo_multiplier_to_stats(real_stats: dict) -> dict:
    """Apply demo multipliers to task statistics.

    Args:
        real_stats: Dictionary with keys: in_progress, in_review, closed, completed, total

    Returns:
        Dictionary with demo numbers added to real stats
    """
    if DEMO_MULTIPLIER == 0:
        return real_stats

    demo_additions = {
        "in_progress": DEMO_BASE_TASKS["in_progress"]
        * DEMO_MULTIPLIER,
        "in_review": DEMO_BASE_TASKS["in_review"]
        * DEMO_MULTIPLIER,
        "closed": DEMO_BASE_TASKS["closed"] * DEMO_MULTIPLIER,
        "completed": DEMO_BASE_TASKS["completed"]
        * DEMO_MULTIPLIER,
    }

    total_demo_addition = sum(demo_additions.values())

    return {
        "in_progress": real_stats["in_progress"]
        + demo_additions["in_progress"],
        "in_review": real_stats["in_review"]
        + demo_additions["in_review"],
        "closed": real_stats["closed"] + demo_additions["closed"],
        "completed": real_stats["completed"]
        + demo_additions["completed"],
        "total": real_stats["total"] + total_demo_addition,
    }


def apply_demo_multiplier_to_timeseries(
    timeseries: list[dict], field_multipliers: dict[str, int]
) -> list[dict]:
    """Apply demo multipliers to timeseries data.

    Args:
        timeseries: List of timeseries data points (dicts)
        field_multipliers: Dict mapping field names to their base multipliers

    Returns:
        List with demo numbers multiplied (preserving relative variations)
    """
    if DEMO_MULTIPLIER == 0:
        return timeseries

    result = []
    for item in timeseries:
        enhanced_item = dict(item)
        for field, base_value in field_multipliers.items():
            if field in enhanced_item:
                # Multiply the actual value to preserve relative variations
                # Use base_value as minimum to avoid zeros becoming zeros
                original = enhanced_item[field]
                if original > 0:
                    enhanced_item[field] = (
                        original * DEMO_MULTIPLIER
                    )
                else:
                    # For zero values, use a small fraction of base value
                    enhanced_item[field] = (
                        base_value * DEMO_MULTIPLIER // 10
                    )
        result.append(enhanced_item)

    return result


def _enhance_overview_section(enhanced: dict) -> None:
    """Enhance overview section with demo data."""
    if (
        "overview" in enhanced
        and "timeseries" in enhanced["overview"]
    ):
        enhanced["overview"]["timeseries"] = (
            apply_demo_multiplier_to_timeseries(
                enhanced["overview"]["timeseries"],
                {"taskCount": 100},  # Base 100 tasks per day
            )
        )


def _enhance_performance_section(enhanced: dict) -> None:
    """Enhance performance section with demo data."""
    if (
        "performance" in enhanced
        and "summary" in enhanced["performance"]
    ):
        summary = enhanced["performance"]["summary"]
        summary["taskCount"] = summary.get("taskCount", 0) + (
            100 * DEMO_MULTIPLIER
        )


def _enhance_feedback_section(enhanced: dict) -> None:
    """Enhance feedback section with demo data."""
    if (
        "feedback" in enhanced
        and "timeseries" in enhanced["feedback"]
    ):
        enhanced["feedback"]["timeseries"] = (
            apply_demo_multiplier_to_timeseries(
                enhanced["feedback"]["timeseries"],
                {
                    "totalTasks": 100,
                    "tasksWithFeedback": 25,
                    "positiveCount": 20,
                    "negativeCount": 5,
                    "feedbackCount": 25,
                },
            )
        )


def _enhance_quality_section(enhanced: dict) -> None:
    """Enhance quality section with demo data."""
    if (
        "quality" not in enhanced
        or "summary" not in enhanced["quality"]
    ):
        return

    enhanced_summary = []
    for metric in enhanced["quality"]["summary"]:
        enhanced_metric = dict(metric)

        if (
            "evaluationCount" in enhanced_metric
            and enhanced_metric["evaluationCount"] > 0
        ):
            enhanced_metric["evaluationCount"] = enhanced_metric[
                "evaluationCount"
            ] + (
                DEMO_BASE_ANALYTICS["quality_evaluations"]
                * DEMO_MULTIPLIER
            )

        enhanced_summary.append(enhanced_metric)
    enhanced["quality"]["summary"] = enhanced_summary


def apply_demo_multiplier_to_analytics(
    analytics_data: dict,
) -> dict:
    """Apply demo multipliers to analytics data (overview, performance, quality, feedback).

    Args:
        analytics_data: Analytics response with overview, performance, quality, feedback sections

    Returns:
        Enhanced analytics data with demo numbers
    """
    if DEMO_MULTIPLIER == 0:
        return analytics_data

    enhanced = dict(analytics_data)

    _enhance_overview_section(enhanced)
    _enhance_performance_section(enhanced)
    _enhance_feedback_section(enhanced)
    _enhance_quality_section(enhanced)

    return enhanced
