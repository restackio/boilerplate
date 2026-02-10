"""Salesforce Contacts API Sample (AgentDealer / Office Technology CRM).

Mock data for listing all contacts from a CRM used in office technology sales.
Aligns with https://www.agentdealer.com/industry-features (territory, accounts, quotes).
"""

SALESFORCE_CONTACTS_SAMPLE = {
    "totalSize": 2,
    "done": True,
    "records": [
        {
            "attributes": {
                "type": "Contact",
                "url": "/services/data/v59.0/sobjects/Contact/003xx000001234AAAQ",
            },
            "Id": "003xx000001234AAAQ",
            "AccountId": "001xx000001AbcDEF",
            "FirstName": "Sarah",
            "LastName": "Chen",
            "Email": "sarah.chen@acme-office.com",
            "Phone": "+1 (555) 234-5678",
            "Title": "Office Manager",
            "MailingStreet": "100 Business Park Dr",
            "MailingCity": "Austin",
            "MailingState": "TX",
            "MailingPostalCode": "78701",
            "MailingCountry": "USA",
            "CreatedDate": "2024-01-15T10:30:00.000+0000",
            "LastModifiedDate": "2024-11-20T14:22:00.000+0000",
            "OwnerId": "005xx000001AbcDEF",
        },
        {
            "attributes": {
                "type": "Contact",
                "url": "/services/data/v59.0/sobjects/Contact/003xx000001235AAAR",
            },
            "Id": "003xx000001235AAAR",
            "AccountId": "001xx000001AbcDEG",
            "FirstName": "Michael",
            "LastName": "Torres",
            "Email": "michael.torres@globalprint.io",
            "Phone": "+1 (555) 876-5432",
            "Title": "IT Director",
            "MailingStreet": "250 Tech Center Blvd",
            "MailingCity": "Denver",
            "MailingState": "CO",
            "MailingPostalCode": "80202",
            "MailingCountry": "USA",
            "CreatedDate": "2024-03-22T09:00:00.000+0000",
            "LastModifiedDate": "2024-11-18T11:15:00.000+0000",
            "OwnerId": "005xx000001AbcDEF",
        },
    ],
}
