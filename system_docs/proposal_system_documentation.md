# Proposal & Application System

## System Name
**Proposal & Application System**

---

## Purpose and Responsibilities

The Proposal system manages the bidding and hiring workflow between freelancers and clients. It is responsible for:

- Allowing freelancers to submit proposals (bids) on open jobs.
- Enforcing a one-proposal-per-freelancer-per-job constraint (with re-application allowed after rejection).
- Allowing clients to accept or reject proposals on their own jobs.
- Automating job status transitions when a proposal is accepted.
- Rejecting all competing proposals when one is accepted.
- Notifying relevant parties of state changes via the Notification system.
- Allowing freelancers to view and delete their own pending proposals.

---

## Key Components

### Backend

| File | Role |
|---|---|
| `backend/app/routers/proposal.py` | REST router for `/proposals/*` endpoints |
| `backend/app/services/proposal_service.py` | `ProposalService` — all proposal business logic |
| `backend/app/models/proposal.py` | `Proposal` ORM model with relationships |
| `backend/app/schemas/proposal.py` | Pydantic schemas: `ProposalCreate`, `ProposalResponse` |

### Frontend

| File | Role |
|---|---|
| `frontend-clean/src/app/services/proposal.ts` | `ProposalService`: HTTP wrappers for proposal endpoints |
| `frontend-clean/src/app/pages/client-dashboard/` | Clients view, accept, and reject proposals on their jobs |
| `frontend-clean/src/app/pages/freelancer-dashboard/` | Freelancers apply, view status, and retract proposals |

---

## Architecture Overview

```
[Freelancer] POST /proposals/apply
    └── ProposalService.apply_to_job()
            ├── Validate job exists & is "open"
            ├── Check for duplicate (UNIQUE constraint: job_id + freelancer_id)
            ├── If rejected prior: update existing proposal to "pending"
            ├── INSERT Proposal (status="pending")
            └── Notify job owner (client) via NotificationService

[Client] POST /proposals/accept/{id}
    └── ProposalService.accept_proposal()
            ├── Validate proposal is "pending" and job is "open"
            ├── proposal.status = "accepted"
            ├── job.status = "in_progress"
            ├── UPDATE all other proposals for this job → status = "rejected"
            └── Notify accepted freelancer via NotificationService

[Client] POST /proposals/reject/{id}
    └── ProposalService.reject_proposal()
            └── proposal.status = "rejected" (job stays "open")

[Freelancer] DELETE /proposals/{id}
    └── ProposalService.delete_proposal()
            └── Only if status = "pending"

[Freelancer] GET /proposals/me
    └── ProposalService.get_my_proposals() — joinedload Job relationship
```

---

## Data Flow

### Application Submission
1. Freelancer sends `{ job_id, message, price }` to `POST /proposals/apply`.
2. `get_current_freelancer` validates the requester role.
3. Job is checked: must exist and be `status="open"`.
4. Duplicate check: if a proposal exists with same `job_id + freelancer_id`:
   - If status != `"rejected"` → `HTTP 400 "Already applied"`.
   - If status == `"rejected"` → update existing row with new message/price, reset to `"pending"`.
5. New `Proposal` row inserted with `status="pending"`.
6. `NotificationService.create_notification()` fires asynchronously for the job owner.

### Proposal Acceptance
1. Client sends `POST /proposals/accept/{proposal_id}`.
2. Ownership check: `job.client_id == user.id`.
3. State checks: proposal must be `"pending"`, job must be `"open"`.
4. `proposal.status = "accepted"`, `job.status = "in_progress"`.
5. Bulk UPDATE: all other proposals on the same job → `"rejected"`.
6. Freelancer notified of acceptance via `NotificationService`.

---

## Dependencies

### Internal
- **Authentication** — `get_current_freelancer`, `get_current_client`
- **Database Layer** — `Session` via `Depends(get_db)`
- **Job Management** — validates job existence and status; updates `Job.status`
- **Notification System** — dispatches notifications on apply and accept events

### External
| Library | Purpose |
|---|---|
| `sqlalchemy.orm.joinedload` | Eager-loads `Proposal.job` and `Proposal.freelancer` relationships |
| `fastapi` | Router, HTTPException |

---

## Technologies Used
- Backend: FastAPI, SQLAlchemy ORM (with relationships), MySQL
- Frontend: Angular 21, `HttpClient`, `Observable`

---

## Key Algorithms & Logic

### Re-Application Logic
A `UNIQUE` constraint on `(job_id, freelancer_id)` prevents duplicate rows. On a re-apply after rejection, the service detects the existing rejected proposal and updates it in-place rather than inserting a new row.

### Competing Proposal Mass Rejection
```python
db.query(Proposal).filter(
    Proposal.job_id == proposal.job_id,
    Proposal.id != proposal_id
).update({"status": "rejected"})
```
This uses a single bulk UPDATE across all competing proposals atomically within the same transaction.

### ORM Eager Loading
`get_job_proposals()` and `get_my_proposals()` use `joinedload` to pre-fetch the related `User` (freelancer) and `Job` records in a single SQL JOIN, avoiding N+1 query problems.

---

## Integration Points

| System | Integration |
|---|---|
| **Job Management** | Proposal acceptance transitions the job to `in_progress` |
| **Notification System** | Fires on: new proposal submitted, proposal accepted |
| **Authentication** | `get_current_freelancer` and `get_current_client` guard endpoints |
| **Report/Moderation** | Proposals accumulate `report_count`; admin can delete proposals |
| **Admin Panel** | Admins view paginated proposals and can delete flagged ones |
| **Chatbot** | Queries proposals with role-filtered visibility |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **No proposal editing** | Freelancers cannot update a pending proposal — only retract and re-apply |
| **No notification on rejection** | When a client rejects a proposal, the freelancer receives no in-app notification |
| **Mass rejection not async** | The bulk rejection UPDATE is synchronous and inside the same request; could slow response for jobs with many applicants |
| **Price stored as INTEGER** | Fractional bids not supported |
| **No proposal message length validation** | `VARCHAR(255)` is the only limit; no frontend validation enforced |
| **Race condition on acceptance** | Two simultaneous acceptance requests for the same proposal could both succeed before the lock is released |
