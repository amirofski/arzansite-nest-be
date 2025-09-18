# Admin Guide: Domain Extensions & Email Logs

This guide explains how admins can manage domain extensions pricing/availability and browse email delivery logs via the backend API.

Base URL: /api

Auth
- All endpoints require a Bearer JWT of an admin user.

---

Domain Extensions

List all extensions with prices
GET /domains/prices
Response 200 example:
{
  "success": true,
  "data": [
    { "$id": "ext_ir", "extension": ".ir", "price": 50000, "available": true },
    { "$id": "ext_com", "extension": ".com", "price": 80000, "available": true }
  ],
  "timestamp": "..."
}

Update a specific extension (price/availability)
PUT /domains/prices/:extensionId
Body:
{
  "price": 60000,
  "available": true
}
Response 200 example:
{
  "success": true,
  "data": { "$id": "ext_ir", "extension": ".ir", "price": 60000, "available": true },
  "timestamp": "..."
}

Check availability (utility for support/admin)
POST /domains/check-availability
Body:
{ "domain": "mysite", "extension": ".ir" }
Response example:
{ "success": true, "data": { "available": true, "domain": "mysite.ir" }, "timestamp": "..." }

Frontend usage
- Wizard domain step should GET /domains/extensions to populate selectable suffixes and prices.
- Show an inline “Check availability” action calling POST /domains/check-availability.
- Respect available=false by disabling in UI.

---

Email Logs

List logs with filters
GET /emails/logs?limit=50&offset=0&success=true|false&template_type=welcome|payment_notification|...
Response 200 example:
{
  "success": true,
  "data": {
    "total": 1,
    "items": [
      {
        "$id": "log_abc",
        "to_email": "user@example.com",
        "subject": "Welcome",
        "success": true,
        "service_used": "custom_smtp",
        "template_type": "welcome",
        "sent_at": "2025-09-14T08:00:00.000Z"
      }
    ]
  },
  "timestamp": "..."
}

Model (collection APPWRITE_COLLECTION_EMAIL_LOGS)
- to_email:string
- subject:string
- success:boolean
- error_message:string
- service_used:string
- template_type:string
- sent_at:string (ISO)

Frontend ideas
- Table with columns: sent_at, to_email, subject, status, template_type, service_used.
- Filters: success (All/Success/Failed), template_type, date range.
- Pagination using limit/offset.

---

cURL examples

1) Update a domain extension
curl -X PUT "https://<host>/api/domains/prices/ext_ir" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"price": 60000, "available": true}'

2) List email logs (failed only)
curl "https://<host>/api/emails/logs?limit=50&offset=0&success=false" \
  -H "Authorization: Bearer <JWT>"

3) Check domain availability
curl -X POST "https://<host>/api/domains/check-availability" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"domain":"mysite","extension":".ir"}'

---

Notes
- Email logs require APPWRITE_COLLECTION_EMAIL_LOGS configured in .env.
- Domain extensions use APPWRITE_COLLECTION_DOMAIN_EXTENSIONS; ensure attributes: extension, price, available, description?, isDefault?, created_at, updated_at.
