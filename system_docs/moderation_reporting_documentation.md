# Moderation & Reporting System

## System Name
**Content Moderation & Reporting System**

---

## Purpose and Responsibilities

The Moderation system enables users to flag inappropriate content and provides administrators with tools to review and act on those flags. Its responsibilities include:

- Accepting user-submitted reports against jobs and proposals.
- Enforcing one-report-per-user-per-target integrity via a database unique constraint.
- Maintaining a denormalized `report_count` on the targeted entity for quick threshold checks.
- Escalating high-report-count content to admins via the n8n automation workflow.
- Notifying all admin accounts in-app upon every new report.
- Providing admins with views of all reports, filterable by job or proposal.
- Allowing admins to "ignore" reports (delete the report record without removing the target).

---

## Key Components

### Backend

| File | Role |
|---|---|
| `backend/app/routers/report.py` | REST router for `/reports/*` endpoints |
| `backend/app/services/report_service.py` | `ReportService` — all report logic, admin notification, n8n trigger |
| `backend/app/models/report.py` | `Report` ORM model with unique constraint |
| `backend/app/schemas/report.py` | Pydantic schemas: `ReportCreate`, `ReportResponse` |
| `backend/app/core/n8n.py` | `trigger_report_alert()` — HTTP POST to n8n webhook on threshold breach |

### Frontend

| File | Role |
|---|---|
| `frontend-clean/src/app/services/report.ts` | `ReportService`: HTTP wrappers for reporting endpoints |
| `frontend-clean/src/app/pages/admin-dashboard/` | Admin reviews all reports and ignores/dismisses them |
| `frontend-clean/src/app/pages/home/` | Report button on job cards |
| `frontend-clean/src/app/pages/freelancer-dashboard/` | Report button on proposal cards |

---

## Architecture Overview

```
[User] POST /reports/job/{id}  OR  POST /reports/proposal/{id}
       └── ReportService.report_job() / report_proposal()
               │
               ├── Validate target exists
               ├── INSERT Report (unique: reporter_id + target_type + target_id)
               │       └── IntegrityError → 400 "Already reported"
               ├── Increment entity.report_count
               │
               ├── Notify ALL admins via NotificationService.create_notification()
               │
               └── if report_count > 2 → trigger_report_alert() → n8n webhook
                           └── POST http://n8n:5678/webhook/<id>
                                   └── n8n sends admin email alert

[Admin] GET /reports/               → all reports (desc by date)
[Admin] GET /reports/job/{id}       → reports for specific job
[Admin] GET /reports/proposal/{id}  → reports for specific proposal
[Admin] DELETE /reports/{id}        → ignore (delete report row only)
```

---

## Data Flow

### Report Submission
1. Authenticated user sends `{ reason }` to `POST /reports/job/{job_id}`.
2. `ReportService.report_job()` queries the `Job` to confirm it exists.
3. A `Report` row is created with `reporter_id`, `target_type="job"`, `target_id=job_id`, `reason`.
4. DB insert attempted in a try/except block:
   - `IntegrityError` (unique violation) → `HTTP 400 "Already reported"`.
5. `job.report_count` incremented by 1 in the same transaction.
6. All admin users are queried; `NotificationService.create_notification()` called for each.
7. If `report_count > 2`: `trigger_report_alert("job", job.id, job.title, count)` fires synchronously.

### Report Viewing (Admin)
- Reports are fetched from the `reports` table ordered by `created_at DESC`.
- `_format_reports()` enriches each report with `reporter_name` by querying the `User` table per-report.

### Ignore Report
- Admin calls `DELETE /reports/{report_id}`.
- The `Report` row is deleted.
- The targeted entity (job or proposal) is **not** deleted, and `report_count` is **not** decremented.

---

## Dependencies

### Internal
- **Authentication** — `get_current_user` (submit), `get_current_admin` (view/ignore)
- **Database Layer** — `Session` for all DB operations
- **Notification System** — broadcasts report alerts to all admin users
- **n8n Automation** — receives HTTP trigger when report threshold is exceeded
- **Job Management** — `report_count` maintained on `Job` model
- **Proposal System** — `report_count` maintained on `Proposal` model

### External
| Library | Purpose |
|---|---|
| `sqlalchemy.exc.IntegrityError` | Catches unique constraint violations for duplicate reports |
| `httpx` | Synchronous HTTP client used to call n8n webhooks |

---

## Technologies Used
- Backend: FastAPI, SQLAlchemy, MySQL
- Escalation automation: n8n (via HTTP webhook)
- Frontend: Angular 21, `HttpClient`

---

## Key Algorithms & Logic

### Unique Report Enforcement
```python
__table_args__ = (
    UniqueConstraint("reporter_id", "target_type", "target_id", name="unique_report"),
)
```
A single DB-level unique constraint prevents duplicate reports. The application layer catches `IntegrityError` and returns a user-friendly message.

### Threshold Escalation
```python
THRESHOLD = 2
if entity.report_count > THRESHOLD:
    trigger_report_alert(type_, id_, title, count)
```
The threshold is hardcoded at 2. Reports 3+ trigger an n8n webhook that delivers an admin email.

### Report Response Enrichment
```python
for r in reports:
    reporter = db.query(User).filter(User.id == r.reporter_id).first()
    result.append(ReportResponse(..., reporter_name=reporter.name))
```
This is an N+1 query pattern — one extra DB call per report row.

---

## Integration Points

| System | Integration |
|---|---|
| **Notification System** | Every report triggers in-app notifications for all admins |
| **n8n Automation** | Threshold breach triggers HTTP POST to n8n for email escalation |
| **Job Management** | Report count maintained on `Job`; admin can delete reported jobs |
| **Proposal System** | Report count maintained on `Proposal`; admin can delete reported proposals |
| **Admin Panel** | Consumes report APIs for moderation dashboard |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **N+1 query in report formatting** | `_format_reports()` fires one DB query per report for `reporter_name`. Should use a JOIN or `joinedload`. |
| **Hardcoded threshold** | The `> 2` threshold for n8n escalation is hardcoded with no admin configuration. |
| **report_count not decremented on ignore** | Ignoring a report does not decrement the entity's `report_count`, so threshold re-triggering cannot occur correctly. |
| **Admin fan-out** | Every report sends N notifications (one per admin). As admin accounts grow, this is O(N) inserts and WebSocket pushes per report. |
| **Synchronous n8n call** | `trigger_report_alert()` is a blocking `httpx.post()` inside an `async` endpoint. A slow or down n8n instance will delay the API response. Should be `asyncio.create_task()` or a background task. |
| **No report categories/severity** | All reports are equal — there is no severity level, category, or escalation priority beyond count. |
| **No report history after ignore** | Deleting a report erases the audit trail of who reported what and why. |
