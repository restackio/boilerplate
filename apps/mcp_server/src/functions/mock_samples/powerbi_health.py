# """Power BI semantic model mock — QRM-style facility KPI export
#
# Row shape: client → facility weekly metrics (rehab ops KPIs, no PHI).
# Narrative: stand-in for remote Power BI MCP query results
# (https://learn.microsoft.com/en-us/power-bi/developer/mcp/remote-mcp-server-get-started)
# without calling Fabric. KPI-only rehab operations data; no patient identifiers.
# """

POWERBI_HEALTH_SAMPLE = {
    "semantic_model": {
        "id": "qrm-facility-kpis",
        "display_name": "QRM Facility KPIs",
        "description": (
            "Weekly facility-level rehab operations metrics; "
            "aggregated KPIs only, no PHI."
        ),
    },
    "query_context": {
        "kind": "semantic_query_mock",
        "natural_language_summary": (
            "Export weekly KPI rows by client, facility, region, and metric "
            "for trend and benchmark questions."
        ),
    },
    "result": {
        "columns": [
            "client_id",
            "facility_id",
            "facility_name",
            "region",
            "metric",
            "value",
            "period",
        ],
        "rows": [
            {
                "client_id": "C001",
                "facility_id": "F001",
                "facility_name": "Site #1",
                "region": "Northeast",
                "metric": "total_cost",
                "value": 130190.0,
                "period": "2025-W42",
            },
            {
                "client_id": "C001",
                "facility_id": "F001",
                "facility_name": "Site #1",
                "region": "Northeast",
                "metric": "productivity_overall",
                "value": 86.17,
                "period": "2025-W42",
            },
            {
                "client_id": "C002",
                "facility_id": "F003",
                "facility_name": "Site #1",
                "region": "Southeast",
                "metric": "cost_per_tx_minute_w_fee",
                "value": 1.1,
                "period": "2025-W42",
            },
        ],
    },
    "metric_catalog": {
        "allowed_metric_keys": [
            "total_cost",
            "treatment_minutes",
            "cost_per_tx_minute_w_fee",
            "blended_rate",
            "evaluator_to_assistant_pct",
            "productivity_overall",
            "gc_therapy_utilization",
        ],
        "period_format": "ISO week, e.g. 2025-W42",
    },
}
