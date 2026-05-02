# Admin Dashboard System

## System Name
**Admin Dashboard & Management System**

---

## Purpose and Responsibilities

The Admin Dashboard system provides a unified control plane for platform administrators. It is responsible for:

- Aggregating and displaying platform-wide statistics (users, jobs, proposals).
- Listing all users with deletion capability.
- Providing paginated, searchable views of all jobs and proposals.
- Enabling forceful deletion of jobs and proposals with admin-authored messages sent to affected users.
- Presenting and managing content moderation reports.
- Restricting all admin functionality to users with the `admin` role.

---

## Key Components

### Backend

| File | Role |
|---|---|
| `backend/app/routers/admin.py` | REST router for `/admin/*` endpoints |
| `backend/app/services/admin_service.py` | `AdminService` — statistics, user/job/proposal management |
| `backend/app/core/dependencies.py` | `get_current_admin()` — role enforcement |

### Frontend

| File | Role |
|---|---|
| `frontend-clean/src/app/services/admin.ts` | `AdminService` — HTTP wrappers for admin endpoints |
| `frontend-clean/src/app/pages/admin-dashboard/admin-dashboard.ts` | Main admin component (19 KB) |
| `frontend-clean/src/app/pages/admin-dashboard/admin-dashboard.html` | Template (30 KB) |
| `frontend-clean/src/app/pages/admin-dashboard/admin-dashboard.css` | Styling (19 KB) |
| `frontend-clean/src/app/core/guards/role-guard.ts` | Enforces `role="admin"` on route `/AdminDashboard` |

---

## Architecture Overview

```
Browser [Admin User]
    │
    ├── Route: /AdminDashboard
    │       └── roleGuard: role == "admin" enforced
    │
    └── AdminDashboardComponent
            │
            ├── [Init] AdminService.getAllData() → forkJoin(stats, users, jobs, proposals)
            │
            ├── [Stats Panel]     GET /admin/stats
            │                          └── AdminService.get_stats() → counts per table
            │
            ├── [Users Panel]     GET /admin/users → all users
            │                     DELETE /admin/users/{id} → AdminService.delete_user()
            │
            ├── [Jobs Panel]      GET /admin/jobs?skip&limit&search_id
            │                     DELETE /admin/jobs/{id} { admin_message }
            │                          └── cascade: reports → proposals → job → notify client
            │
            ├── [Proposals Panel] GET /admin/proposals?skip&limit&search_id
            │                     DELETE /admin/proposals/{id} { admin_message }
            │                          └── cascade: reports → proposal → notify freelancer
            │
            └── [Reports Panel]   GET /reports/ → all reports
                                  DELETE /reports/{id} → ignore report
```

---

## Data Flow

### Dashboard Initialization
1. Component calls `AdminService.getAllData()` which uses RxJS `forkJoin` to fire 4 parallel HTTP requests:
   - `GET /admin/stats` → `{ users, jobs, proposals, job_status: { open, in_progress, completed } }`
   - `GET /admin/users` → full user list
   - `GET /admin/jobs?skip=0&limit=50` → paginated job list
   - `GET /admin/proposals?skip=0&limit=50` → paginated proposal list
2. All responses are combined and bound to component state.

### Paginated Job / Proposal Search
- `skip` and `limit` control server-side pagination (50 items per page).
- `search_id` provides exact integer-ID lookup, bypassing pagination.
- The backend returns `{ items: [...], total: N }` for frontend pagination controls.

### User Deletion Cascade (Backend)
```
AdminService.delete_user(user_id):
    if role == "client":
        for each client job:
            delete reports for job
            delete proposals for job
            delete job
    if role == "freelancer":
        delete reports on freelancer's proposals
        delete freelancer's proposals
    delete reports filed BY this user
    delete notifications FOR this user
    delete user
```

### Job Deletion Cascade (Backend)
```
AdminService.delete_job(job_id, admin_message):
    delete reports for job
    delete proposals for job
    delete job
    notify client (NotificationService)
```

### Statistics Computation
```python
AdminService.get_stats():
    total_users = COUNT(users)
    total_jobs  = COUNT(jobs)
    total_proposals = COUNT(proposals)
    open_jobs = COUNT(jobs WHERE status='open')
    in_progress_jobs = COUNT(...)
    completed_jobs = COUNT(...)
```
All computed in a single request with 6 separate COUNT queries.

---

## Dependencies

### Internal
- **Authentication** — `get_current_admin` gate on all backend routes; `roleGuard` on frontend route
- **Database Layer** — `Session` for all queries
- **Notification System** — fires notifications to affected users on admin deletions
- **Job Management** — admin views and deletes jobs
- **Proposal System** — admin views and deletes proposals
- **Report/Moderation** — admin views and ignores reports

### External
| Library | Purpose |
|---|---|
| `rxjs.forkJoin` | Parallel HTTP requests for dashboard initialization |
| `pydantic.BaseModel` | `AdminDeleteBody` for admin message payload |

---

## Technologies Used
- Backend: FastAPI, SQLAlchemy, MySQL
- Frontend: Angular 21, `HttpClient`, RxJS `forkJoin`
- Route protection: Angular `roleGuard`

---

## Key Algorithms & Logic

### Proposal List Enrichment
`AdminService.get_proposals()` does not use ORM `joinedload`. Instead it manually iterates proposals and accesses `p.job.title` and `p.freelancer.name` via lazy-loaded ORM relationships, assembling a dict list. This is an N+1 pattern but acceptable for admin use with low-frequency access.

### ID Search
```python
if search_id is not None:
    query = query.filter(Job.id == search_id)
```
The search filters by exact primary key, short-circuiting pagination entirely.

---

## Integration Points

| System | Integration |
|---|---|
| **Authentication** | `get_current_admin` dependency on all backend routes |
| **Notification System** | Deletion actions dispatch notifications to affected users |
| **Job Management** | Full read and delete access to all jobs |
| **Proposal System** | Full read and delete access to all proposals |
| **Report/Moderation** | Full read access to all reports; ignore (delete) reports |
| **Chatbot** | Admin chatbot role has full database visibility |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **No action audit log** | Admin deletions are not recorded — there is no history of what an admin deleted, when, or why (beyond the notification message). |
| **Statistics are live queries** | All 6 COUNT queries run on every stats request with no caching. Under high load, these become a performance bottleneck. |
| **N+1 in proposal enrichment** | Lazy-loading `p.job` and `p.freelancer` in `get_proposals()` fires extra DB queries per proposal. |
| **User deletion is irreversible** | No soft-delete or deactivation mechanism; deleted users cannot be recovered. |
| **Admin cannot suspend/ban users** | The only moderation action on users is permanent deletion — there is no suspension, warning, or role change capability. |
| **No admin action confirmation** | The frontend should require password re-entry or confirmation dialog for destructive actions; this relies solely on the admin message field. |
| **Single admin role** | All admins have identical permissions — there is no super-admin or tiered permission model. |
