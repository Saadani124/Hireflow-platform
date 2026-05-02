# Database Layer

## System Name
**Database Layer (ORM & Schema Management)**

---

## Purpose and Responsibilities

The Database Layer provides all data persistence infrastructure for the Hireflow platform. It is responsible for:

- **Engine bootstrapping**: Creating and managing the SQLAlchemy connection pool to a MySQL database.
- **Session lifecycle**: Providing per-request database sessions via FastAPI's dependency injection.
- **Schema definition**: Declaring all relational table structures as Python ORM classes.
- **Schema migrations**: Tracking and applying incremental schema changes via Alembic.
- **Relationship management**: Defining ORM-level foreign key relationships between entities.
- **Data seeding**: Bootstrapping initial admin accounts and test data on startup.

---

## Key Components

| File | Role |
|---|---|
| `backend/app/db/base.py` | Declares `Base = declarative_base()` — the shared ORM registry |
| `backend/app/db/session.py` | Creates the SQLAlchemy `engine`, `SessionLocal` factory, and `get_db()` generator |
| `backend/app/models/user.py` | `User` table: id, name, email, password_hash, role, profile_image, is_verified |
| `backend/app/models/job.py` | `Job` table: id, title, description, budget, status, category, client_id, report_count |
| `backend/app/models/proposal.py` | `Proposal` table: id, job_id, freelancer_id, message, price, status, report_count |
| `backend/app/models/notification.py` | `Notification` table: id, user_id, type, title, message, link, is_read |
| `backend/app/models/report.py` | `Report` table: id, reporter_id, target_type, target_id, reason |
| `backend/app/models/__init__.py` | Re-exports all models so SQLAlchemy discovers them before `create_all()` |
| `backend/alembic/` | Alembic migration environment (`env.py`, `script.py.mako`) |
| `backend/alembic.ini` | Alembic configuration file |
| `backend/seed_v2.py` | Standalone script for seeding test data |
| `backend/app/main.py` (lines 54–82) | Calls `Base.metadata.create_all()` and `seed_admins()` on startup |

---

## Architecture Overview

```
FastAPI Request
      │
      ▼
get_db() [Depends]
      │
      ├── SessionLocal() → SQLAlchemy Session
      │         │
      │         ▼
      │    MySQL Database (hireflow)
      │         │
      │         ├── users
      │         ├── jobs
      │         ├── proposals
      │         ├── notifications
      │         └── reports
      │
      └── session.close() [finally block]


Schema Initialization (on app start):
  Base.metadata.create_all(bind=engine)
  └── Creates all tables if they do not exist

Migration Path (manual):
  alembic revision --autogenerate
  alembic upgrade head
```

---

## Data Flow

### Request-Scoped Session
1. A FastAPI route declares `db: Session = Depends(get_db)`.
2. `get_db()` yields a fresh `SessionLocal()` instance.
3. The route handler performs queries/inserts/updates.
4. On route completion (success or exception), `db.close()` is called in the `finally` block.
5. Transactions are manual: code must call `db.commit()` explicitly; there is no `autocommit`.

### Schema Bootstrap (Startup)
1. `main.py` imports all model classes (triggering their registration with `Base`).
2. `Base.metadata.create_all(bind=engine)` inspects the database and creates any missing tables.
3. `seed_admins()` inserts the two hardcoded admin accounts if they don't already exist.

---

## Database Schema (Entity Relationship Summary)

```
users (id PK)
  ├──< jobs.client_id FK
  ├──< proposals.freelancer_id FK
  ├──< notifications.user_id FK (CASCADE DELETE)
  └──< reports.reporter_id FK (CASCADE DELETE)

jobs (id PK)
  └──< proposals.job_id FK
       └──< reports (target_type="job", target_id)

proposals (id PK)
  └──< reports (target_type="proposal", target_id)
       UNIQUE (job_id, freelancer_id) — one application per freelancer per job

reports (id PK)
  UNIQUE (reporter_id, target_type, target_id) — one report per user per target

notifications (id PK)
  CASCADE DELETE on user_id
```

### Table Details

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| name | VARCHAR(100) | |
| email | VARCHAR(150) UNIQUE | |
| password_hash | VARCHAR(255) | bcrypt |
| role | VARCHAR(50) | `admin`, `client`, `freelancer` |
| profile_image | VARCHAR(255) | Path to `/uploads/` file |
| is_verified | BOOLEAN | `True` for clients/admins, requires email verify for freelancers |
| created_at | DATETIME | `utcnow` default |

#### `jobs`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| title | VARCHAR(150) | |
| description | TEXT | |
| budget | INTEGER | |
| status | VARCHAR(50) | `open`, `in_progress`, `completed` |
| category | VARCHAR(50) | |
| client_id | INTEGER FK → users.id | |
| report_count | INTEGER | Denormalized counter |
| created_at | DATETIME | |

#### `proposals`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| job_id | INTEGER FK → jobs.id | |
| freelancer_id | INTEGER FK → users.id | |
| message | VARCHAR(255) | Cover letter |
| price | INTEGER | Bid amount |
| status | VARCHAR(50) | `pending`, `accepted`, `rejected` |
| report_count | INTEGER | Denormalized counter |
| created_at | DATETIME | |

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id (CASCADE) | |
| type | VARCHAR(50) | e.g. `new_proposal`, `accepted`, `deleted_job` |
| title | VARCHAR(200) | |
| message | TEXT | |
| link | VARCHAR(300) | Frontend route |
| is_read | BOOLEAN | Default `False` |
| created_at | DATETIME | |

#### `reports`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| reporter_id | INTEGER FK → users.id (CASCADE) | |
| target_type | VARCHAR(20) | `job` or `proposal` |
| target_id | INTEGER | ID of reported entity |
| reason | TEXT | |
| created_at | DATETIME | |

---

## Dependencies

### Internal
- All services (`JobService`, `ProposalService`, etc.) depend on `Session` from this layer.
- `main.py` depends on `engine` and `SessionLocal` for startup initialization.

### External
| Library | Purpose |
|---|---|
| `sqlalchemy` | ORM engine, session, `declarative_base`, column types |
| `pymysql` | MySQL DBAPI driver |
| `psycopg2-binary` | PostgreSQL driver (listed in requirements but MySQL is active) |
| `alembic` | Database migration framework |
| `python-dotenv` | Loads `DATABASE_URL` from `.env` |

---

## Technologies Used

| Technology | Detail |
|---|---|
| ORM | SQLAlchemy Core + ORM |
| Database | MySQL (active: `mysql+pymysql://root:@localhost:3306/hireflow`) |
| Migration tool | Alembic |
| Connection pooling | SQLAlchemy built-in pool with `pool_pre_ping=True` |
| Session pattern | Dependency Injection via FastAPI `Depends(get_db)` |

---

## Key Algorithms & Logic

### Connection Pool Health Check
`pool_pre_ping=True` instructs SQLAlchemy to issue a lightweight `SELECT 1` before handing a connection from the pool to a session. This ensures stale or dropped connections are transparently replaced.

### Denormalized Report Counters
Both `Job.report_count` and `Proposal.report_count` are denormalized integer columns incremented directly in `ReportService`. This avoids a `COUNT(*)` query every time a moderation badge is displayed, at the cost of consistency (if a report row is manually deleted, the counter can drift).

### Cascade Deletes
`notifications.user_id` and `reports.reporter_id` have `ondelete="CASCADE"`. Admin deletion of a user triggers DB-level cascade for those tables, while jobs and proposals owned by the user are deleted programmatically in `AdminService.delete_user()`.

---

## Integration Points

| System | Integration |
|---|---|
| **Authentication** | `get_db()` session injected into all auth endpoints for user queries |
| **Job Management** | `JobService` reads/writes the `jobs` table |
| **Proposal System** | `ProposalService` reads/writes `proposals` with ORM `joinedload` for relationships |
| **Notification System** | `NotificationService` persists to the `notifications` table |
| **Report/Moderation** | `ReportService` persists to `reports` and updates denormalized counters |
| **Admin Panel** | `AdminService` reads across all tables for statistics and management |
| **Chatbot** | `chatbot.py` router queries all tables for contextual data injection |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **No Alembic migration history** | The app uses `create_all()` on startup rather than running `alembic upgrade head`. This means schema changes will not be applied automatically to existing databases. |
| **Denormalized counters** | `report_count` on `Job` and `Proposal` can become inconsistent if reports are deleted without decrementing the counter. |
| **No connection pool size configuration** | SQLAlchemy defaults are used; in production under high concurrency, pool exhaustion is possible. |
| **Root MySQL credentials** | `.env` uses `root` with no password (`root:@localhost`). This is insecure for any non-development environment. |
| **Single-database design** | No read replicas, caching layer (Redis), or query optimization. All reads go directly to the primary MySQL instance. |
| **`psycopg2-binary` unused** | The PostgreSQL driver is in `requirements.txt` but the connection string uses MySQL. This adds unnecessary dependency bloat. |
| **Startup seeding side effect** | `seed_admins()` runs on every server startup, adding a DB round-trip at boot time. |
