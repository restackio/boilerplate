"""ECI e-automate ERP Contact Activities Sample (Managed Print / Office Technology).

Mock data for all ERP activities for one particular contact (contracts, meters, service, supplies).
Aligns with https://www.ecisolutions.com/products/e-automate-managed-print-service-software/
"""

ERP_ECI_CONTACT_ACTIVITIES_SAMPLE = {
    "contact_id": "003xx000001234AAAQ",
    "account_id": "001xx000001AbcDEF",
    "account_name": "Acme Office Solutions",
    "erp_activities": [
        {
            "activity_type": "contract",
            "contract_id": "CNT-2024-0892",
            "contract_type": "M&S",
            "status": "active",
            "start_date": "2024-01-01",
            "end_date": "2026-12-31",
            "device_count": 45,
            "monthly_revenue": 1250.00,
            "created_at": "2023-11-15T10:00:00Z",
        },
        {
            "activity_type": "meter_read",
            "equipment_id": "EQ-789012",
            "serial_number": "SN-XYZ-456789",
            "meter_type": "black_white",
            "read_value": 125000,
            "read_date": "2024-11-01",
            "billing_cycle": "2024-11",
            "created_at": "2024-11-02T06:00:00Z",
        },
        {
            "activity_type": "meter_read",
            "equipment_id": "EQ-789013",
            "serial_number": "SN-XYZ-456790",
            "meter_type": "color",
            "read_value": 42000,
            "read_date": "2024-11-01",
            "billing_cycle": "2024-11",
            "created_at": "2024-11-02T06:00:00Z",
        },
        {
            "activity_type": "service_ticket",
            "ticket_id": "SRV-2024-3341",
            "equipment_id": "EQ-789012",
            "summary": "Toner replacement and drum check",
            "status": "completed",
            "opened_at": "2024-11-10T09:15:00Z",
            "closed_at": "2024-11-10T11:30:00Z",
            "technician_id": "TECH-101",
        },
        {
            "activity_type": "supply_order",
            "order_id": "SUP-2024-5522",
            "equipment_id": "EQ-789013",
            "item_description": "Color toner set",
            "quantity": 2,
            "order_date": "2024-11-12",
            "status": "shipped",
            "created_at": "2024-11-12T14:00:00Z",
        },
    ],
    "contract_profitability_summary": {
        "total_monthly_revenue": 1250.00,
        "total_monthly_costs": 890.00,
        "margin_percent": 28.8,
        "device_count": 45,
    },
}
