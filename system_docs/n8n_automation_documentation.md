# N8N Automation & Email Workflow System

## System Name
**N8N Workflow Automation & Email Delivery System**

---

## Purpose and Responsibilities

The N8N integration layer adds event-driven, external automation capabilities to the Hireflow platform by bridging the backend API to the n8n open-source workflow automation tool. Its responsibilities are:

- **Email verification delivery**: Triggering a transactional email containing a verification link when a freelancer registers.
- **Admin alert escalation**: Sending an automated email alert to administrators when a job or proposal accumulates more than 2 reports.
- **Decoupling email logic**: Externalizing email composition, credential management, and delivery from the backend Python application.

---

## Key Components

### Backend

| File | Role |
|---|---|
| `backend/app/core/n8n.py` | `trigger_verification_email()` and `trigger_report_alert()` — HTTP webhook callers |
| `backend/app/routers/auth.py` | Calls `trigger_verification_email()` during freelancer registration |
| `backend/app/services/report_service.py` | Calls `trigger_report_alert()` when `report_count > 2` |
| `backend/.env` | `N8N_WEBHOOK_URL`, `N8N_REPORT_WEBHOOK_URL`, `FRONTEND_URL` environment variables |

### N8N Configuration

| Artifact | Description |
|---|---|
| `hireflow emailing system.json` | Exported n8n workflow definition (webhook trigger + email node) |
| `n8n_setup_guide.md` | Collaborator setup guide for importing and activating workflows |

---

## Architecture Overview

```
[FastAPI Backend]
    │
    ├── POST /auth/register (freelancer)
    │       └── trigger_verification_email(email, name, link)
    │                   └── httpx.post(N8N_WEBHOOK_URL, { email, name, link })
    │                               └── [n8n Workflow: Verification]
    │                                       ├── Webhook trigger node
    │                                       ├── Email node (Gmail/SMTP)
    │                                       └── Send: "Please verify your email"
    │
    └── POST /reports/job or /reports/proposal (report_count > 2)
            └── trigger_report_alert(type, id, title, count)
                        └── httpx.post(N8N_REPORT_WEBHOOK_URL, { type, id, title, count, link })
                                    └── [n8n Workflow: Report Alert]
                                            ├── Webhook trigger node
                                            ├── Email node (Gmail/SMTP)
                                            └── Send: "Content flagged for review"
```

---

## Data Flow

### Verification Email Trigger
1. Freelancer registers via `POST /auth/register`.
2. `auth.py` calls `create_verification_token(user.id)` → a 24-hour JWT with `purpose="email_verification"`.
3. Constructs `verify_link = f"{FRONTEND_URL}/verify?token={token}"`.
4. Calls `trigger_verification_email(email, name, link)`.
5. `n8n.py` issues `httpx.post(N8N_WEBHOOK_URL, json={ "email": ..., "name": ..., "link": ... }, timeout=10)`.
6. n8n receives the webhook, populates the email template, and delivers via configured SMTP/Gmail credentials.
7. User clicks the link → frontend routes to `/verify` → `GET /auth/verify?token=` → `is_verified=True`.

### Report Alert Trigger
1. A report is submitted and `entity.report_count` exceeds 2.
2. `report_service.py` calls `trigger_report_alert(type_, id_, title, count)`.
3. `n8n.py` issues `httpx.post(N8N_REPORT_WEBHOOK_URL, json={ "type", "id", "title", "report_count", "link" }, timeout=5)`.
4. The `link` field points to the admin dashboard filtered to the flagged content.
5. n8n delivers an alert email to the configured administrator email address.

---

## Webhook Payload Schemas

### Verification Email Payload
```json
{
  "email": "freelancer@example.com",
  "name": "John Doe",
  "link": "http://localhost:4200/verify?token=<JWT>"
}
```

### Report Alert Payload
```json
{
  "type": "job",
  "id": 42,
  "title": "Build a REST API",
  "report_count": 3,
  "link": "http://localhost:4200/admin?section=reports&type=job&id=42"
}
```

---

## Dependencies

### Internal
- **Authentication System** — provides the verification token and calls `trigger_verification_email`
- **Report/Moderation System** — calls `trigger_report_alert` on threshold breach
- **Environment Configuration** — `N8N_WEBHOOK_URL`, `N8N_REPORT_WEBHOOK_URL`, `FRONTEND_URL` from `.env`

### External
| Library / Service | Purpose |
|---|---|
| `httpx` | Synchronous HTTP client to POST to n8n webhooks |
| `python-dotenv` | Loads webhook URLs from `.env` |
| **n8n** (self-hosted) | Workflow automation engine at `http://localhost:5678` |
| **Gmail / SMTP** | Email delivery provider configured inside n8n credentials |

---

## Technologies Used

| Technology | Detail |
|---|---|
| Workflow engine | n8n (self-hosted, Node.js based) |
| Trigger mechanism | HTTP Webhook (POST) |
| HTTP client | `httpx` (synchronous) |
| Email protocol | SMTP or Gmail API (configured in n8n) |
| Workflow format | JSON export (`hireflow emailing system.json`) |

---

## Key Algorithms & Logic

### Graceful Degradation
Both webhook functions check if the environment variable is set before making the HTTP call:
```python
if not N8N_WEBHOOK_URL:
    print("⚠️  N8N_WEBHOOK_URL not set. Skipping email trigger.")
    return
```
This ensures the application starts and runs without errors even if n8n is not configured (e.g., development without email).

### Error Isolation
Exceptions from `httpx.post()` are caught and logged but **not re-raised**. The calling endpoint succeeds even if the n8n delivery fails. This means users can register even if n8n is down, but will not receive a verification email.

---

## Integration Points

| System | Integration |
|---|---|
| **Authentication** | Verification email triggered on freelancer registration |
| **Report/Moderation** | Report alert triggered when content exceeds 2 reports |
| **Frontend (Verify page)** | Receives the JWT token via URL parameter and calls `/auth/verify` |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **Synchronous HTTP call in request path** | `httpx.post()` blocks the FastAPI request for up to 10 seconds (verification) or 5 seconds (reports). Should be replaced with `asyncio.create_task()` or a FastAPI `BackgroundTask`. |
| **No delivery confirmation** | If n8n is down or the email fails to send, neither the user nor the admin is notified. The error is only printed to the server log. |
| **Self-hosted dependency** | n8n must be manually installed, started, and configured for the platform to send emails. This is a significant onboarding burden for new developers. |
| **Webhook URLs are local** | `http://localhost:5678` webhooks are not accessible from any external environment. Production deployment requires exposing n8n or replacing it with a hosted email service (e.g., SendGrid, Mailgun). |
| **No retry mechanism** | Failed webhook calls are silently discarded. There is no queue, retry logic, or dead-letter handling. |
| **Hardcoded threshold** | The `> 2` escalation threshold in `report_service.py` is hardcoded and not configurable via environment or admin settings. |
| **API key in version control** | The `OPENROUTER_API_KEY` in the committed `.env` file is a security risk. `.env` should be in `.gitignore` (it is listed, but the file appears to have been committed at some point). |
