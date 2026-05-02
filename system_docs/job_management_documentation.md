# Job Management System

## System Name
**Job Management System**

---

## Purpose and Responsibilities

The Job Management system is the central marketplace engine of Hireflow. It handles:

- **Job creation**: Authenticated clients post jobs with title, description, budget, and category.
- **Job listing**: Paginated, open-status job feed for all authenticated users.
- **Application-state enrichment**: Annotating jobs with `applied`/`rejected` flags for freelancers.
- **Lifecycle management**: Clients can view their jobs, complete in-progress jobs, and delete open jobs.
- **Admin moderation**: Admins can force-delete any job with cascade deletion of proposals and reports.

---

## Key Components

### Backend

| File | Role |
|---|---|
| `backend/app/routers/job.py` | REST router for `/jobs/*` endpoints |
| `backend/app/services/job_service.py` | `JobService` — all job business logic |
| `backend/app/models/job.py` | `Job` ORM model |
| `backend/app/schemas/job.py` | Pydantic schemas: `JobCreate`, `JobResponse`, `PaginatedJobResponse` |
| `backend/app/routers/admin.py` | Admin endpoints: `GET /admin/jobs`, `DELETE /admin/jobs/{id}` |
| `backend/app/services/admin_service.py` | `AdminService.delete_job()` — cascade delete with notification |

### Frontend

| File | Role |
|---|---|
| `frontend-clean/src/app/services/job.ts` | `JobService`: HTTP wrappers for job endpoints |
| `frontend-clean/src/app/pages/home/` | Home page — paginated open job feed |
| `frontend-clean/src/app/pages/client-dashboard/` | Job creation, my jobs, completion, deletion |
| `frontend-clean/src/app/pages/freelancer-dashboard/` | Browse jobs, view application status |
| `frontend-clean/src/app/pages/admin-dashboard/` | Paginated job table with ID search and deletion |

---

## Architecture Overview

```
[Client] POST /jobs/create → JobService.create_job() → INSERT jobs (status="open")
[Any User] GET /jobs/?skip&limit → list_jobs() → open jobs feed + freelancer enrichment
[Client] POST /jobs/complete/{id} → status = "completed"
[Client] DELETE /jobs/{id} → only if status = "open"
[Admin]  DELETE /admin/jobs/{id} → cascade delete reports → proposals → job → notify client
```

### Job Lifecycle State Machine
```
open  ──[proposal accepted]──▶  in_progress  ──[client completes]──▶  completed
  └──[client deletes]──▶ (deleted)
```

---

## Data Flow

### Freelancer Application Status Enrichment
When a freelancer requests the job feed, a single bulk query retrieves their proposal statuses, builds a `status_map`, and annotates each job:
```python
status_map = {row.job_id: row.status for row in proposals}
job.applied = status is not None and status != "rejected"
job.rejected = status == "rejected"
```

### Admin Job Deletion
1. Delete `Report` rows for the job.
2. Delete all `Proposal` rows for the job.
3. Delete the `Job` row.
4. Send in-app notification to the client via `NotificationService`.

---

## Dependencies

### Internal
- **Authentication** — `get_current_client`, `get_current_user`, `get_current_admin`
- **Database Layer** — `Session` via `Depends(get_db)`
- **Notification System** — called on admin delete to alert the client
- **Proposal System** — `list_jobs()` queries `Proposal` for freelancer enrichment

### External
| Library | Purpose |
|---|---|
| `fastapi` | Router, Depends, HTTPException |
| `sqlalchemy` | ORM queries |
| `@angular/common/http` | HTTP client |

---

## Technologies Used
- Backend: FastAPI, SQLAlchemy, MySQL
- Frontend: Angular 21, `HttpClient`, server-side offset/limit pagination

---

## Key Algorithms & Logic

- **Pagination**: `skip` / `limit` offset pattern; admin adds `search_id` for exact ID lookup.
- **Freelancer enrichment**: O(N) status map built from a single bulk proposal query per request.
- **Categories**: Defined as a static list in `frontend-clean/src/app/core/categories.ts`; stored as free-text VARCHAR in the DB (no server validation).

---

## Integration Points

| System | Integration |
|---|---|
| **Proposal System** | Jobs are the parent entity; proposal acceptance changes job status to `in_progress` |
| **Notification System** | Admin deletion sends notification to affected client |
| **Report/Moderation** | `report_count` on `Job` drives moderation threshold alerts |
| **Authentication** | All endpoints role-gated |
| **Chatbot** | Queries jobs with role-filtered access |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **No job editing** | No `PUT /jobs/{id}` endpoint exists |
| **No search/filter** | Job feed lacks keyword search, budget range, or category filter |
| **Race condition on report_count** | Non-atomic increment under concurrent reports |
| **Category not validated server-side** | Any string accepted as category |
| **No soft delete / audit trail** | Hard delete with no recovery mechanism |
| **Admin can delete active contracts** | `in_progress` jobs can be deleted without warning |
| **INTEGER budget** | Fractional amounts (e.g. $49.99) cannot be stored |
