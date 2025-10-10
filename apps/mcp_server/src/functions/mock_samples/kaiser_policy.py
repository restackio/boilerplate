"""Kaiser Permanente Healthcare Insurance Policy Sample
Mock data structure for health insurance policy queries and coverage verification.
"""

KAISER_POLICY_SAMPLE = {
    "policy": {
        "policy_number": "KP-2024-0123456",
        "policy_type": "Individual Health Plan",
        "plan_name": "Kaiser Permanente Gold 80 HMO",
        "status": "active",
        "effective_date": "2024-01-01",
        "renewal_date": "2025-01-01",
        "member": {
            "member_id": "M123456789",
            "first_name": "John",
            "last_name": "Doe",
            "date_of_birth": "1985-06-15",
            "email": "john.doe@example.com",
            "phone": "(555) 123-4567",
            "address": {
                "street": "123 Main Street",
                "city": "San Francisco",
                "state": "CA",
                "zip_code": "94102",
            },
        },
        "coverage": {
            "annual_deductible": {
                "individual": 1000.00,
                "family": 2000.00,
                "met_to_date": 350.00,
            },
            "out_of_pocket_maximum": {
                "individual": 5000.00,
                "family": 10000.00,
                "met_to_date": 850.00,
            },
            "benefits": {
                "primary_care_visit": {
                    "covered": True,
                    "copay": 25.00,
                    "notes": "Per visit copay for in-network providers",
                },
                "specialist_visit": {
                    "covered": True,
                    "copay": 40.00,
                    "prior_authorization_required": False,
                    "notes": "Referral required from primary care physician",
                },
                "physical_therapy": {
                    "covered": True,
                    "copay": 25.00,
                    "visit_limit": 30,
                    "visits_used": 5,
                    "prior_authorization_required": False,
                    "notes": "Up to 30 visits per calendar year; no referral needed for initial evaluation",
                },
                "emergency_room": {
                    "covered": True,
                    "copay": 250.00,
                    "waived_if_admitted": True,
                    "notes": "Copay waived if admitted to hospital within 24 hours",
                },
                "urgent_care": {
                    "covered": True,
                    "copay": 25.00,
                    "notes": "Available at Kaiser Permanente urgent care facilities",
                },
                "preventive_care": {
                    "covered": True,
                    "copay": 0.00,
                    "notes": "Annual physical, immunizations, and screenings fully covered",
                },
                "mental_health": {
                    "covered": True,
                    "copay": 25.00,
                    "visit_limit": None,
                    "notes": "Individual and group therapy sessions",
                },
                "prescription_drugs": {
                    "covered": True,
                    "tiers": {
                        "tier_1_generic": {
                            "copay": 10.00,
                            "notes": "Most generic drugs",
                        },
                        "tier_2_preferred_brand": {
                            "copay": 30.00,
                            "notes": "Preferred brand-name drugs",
                        },
                        "tier_3_non_preferred": {
                            "copay": 50.00,
                            "notes": "Non-preferred brand-name drugs",
                        },
                        "tier_4_specialty": {
                            "coinsurance": "20%",
                            "notes": "Specialty medications, subject to deductible",
                        },
                    },
                },
                "imaging": {
                    "x_ray": {"covered": True, "copay": 25.00},
                    "mri": {
                        "covered": True,
                        "copay": 100.00,
                        "prior_authorization_required": True,
                    },
                    "ct_scan": {
                        "covered": True,
                        "copay": 100.00,
                        "prior_authorization_required": True,
                    },
                },
                "lab_tests": {
                    "covered": True,
                    "copay": 0.00,
                    "notes": "No copay for lab work ordered by Kaiser provider",
                },
                "chiropractic_care": {
                    "covered": True,
                    "copay": 15.00,
                    "visit_limit": 20,
                    "visits_used": 3,
                    "notes": "Up to 20 visits per calendar year",
                },
                "acupuncture": {
                    "covered": True,
                    "copay": 15.00,
                    "visit_limit": 20,
                    "visits_used": 0,
                    "notes": "Up to 20 visits per calendar year",
                },
                "hospital_inpatient": {
                    "covered": True,
                    "copay": 500.00,
                    "notes": "Per admission copay; no daily copays",
                },
                "outpatient_surgery": {
                    "covered": True,
                    "copay": 150.00,
                    "prior_authorization_required": True,
                },
                "durable_medical_equipment": {
                    "covered": True,
                    "coinsurance": "20%",
                    "prior_authorization_required": True,
                    "notes": "After deductible; includes wheelchairs, walkers, etc.",
                },
            },
        },
        "network": {
            "type": "HMO",
            "region": "Northern California",
            "primary_care_physician": {
                "name": "Dr. Sarah Johnson",
                "npi": "1234567890",
                "facility": "Kaiser Permanente San Francisco Medical Center",
                "phone": "(555) 234-5678",
            },
            "notes": "Coverage limited to Kaiser Permanente facilities and providers, except for emergency care",
        },
        "premium": {
            "monthly_amount": 450.00,
            "billing_frequency": "monthly",
            "next_payment_due": "2024-11-01",
            "payment_method": "automatic_bank_draft",
        },
        "dependents": [
            {
                "member_id": "M123456790",
                "first_name": "Jane",
                "last_name": "Doe",
                "relationship": "spouse",
                "date_of_birth": "1987-03-22",
                "same_coverage": True,
            }
        ],
    },
    "recent_claims": [
        {
            "claim_id": "CLM-2024-08932",
            "date_of_service": "2024-09-15",
            "provider": "Dr. Sarah Johnson",
            "service_description": "Annual Physical Exam",
            "billed_amount": 250.00,
            "insurance_paid": 250.00,
            "patient_responsibility": 0.00,
            "status": "processed",
        },
        {
            "claim_id": "CLM-2024-08654",
            "date_of_service": "2024-08-22",
            "provider": "Kaiser Physical Therapy Center",
            "service_description": "Physical Therapy Session",
            "billed_amount": 120.00,
            "insurance_paid": 95.00,
            "patient_responsibility": 25.00,
            "status": "processed",
        },
    ],
}
