# Hireflow Platform — System Documentation Index

## Overview

**Hireflow** is a freelance marketplace platform enabling clients to post jobs, freelancers to submit proposals, and administrators to moderate the platform. It is built as a decoupled web application with a Python/FastAPI REST + WebSocket backend and an Angular 21 single-page application frontend, supplemented by n8n for email automation and OpenRouter (GPT-4o-mini) for an embedded AI assistant.

---

## System Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Hireflow Platform                             │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                  Frontend (Angular 21 SPA)                  │     │
│  │  Welcome │ Login │ Register │ Verify │ Home │ Dashboards   │     │
│  │                 ↕ HTTP/WS  ↕                               │     │
│  └────────────────────────────────────────────────────────────┘     │
│                           ↕ REST + WebSocket                        │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │               Backend (FastAPI + Python)                    │     │
│  │  Auth │ Jobs │ Proposals │ Notifications │ Reports         │     │
│  │  Admin │ Users │ Chatbot                                   │     │
│  │                 ↕ SQLAlchemy ORM                           │     │
│  └────────────────────────────────────────────────────────────┘     │
│                           ↕                                          │
│  ┌───────────────┐   ┌───────────┐   ┌────────────────────┐        │
│  │ MySQL Database│   │   n8n     │   │  OpenRouter (LLM)  │        │
│  │   (hireflow)  │   │ localhost │   │   gpt-4o-mini      │        │
│  └───────────────┘   └───────────┘   └────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Documented Systems

| # | System | File | Brief Description |
|---|---|---|---|
| 1 | **Authentication & Authorization** | [authentication_documentation.md](authentication_documentation.md) | JWT auth, bcrypt passwords, route guards, role enforcement |
| 2 | **Database Layer** | [database_layer_documentation.md](database_layer_documentation.md) | SQLAlchemy ORM, MySQL schema, Alembic migrations, session management |
| 3 | **Job Management** | [job_management_documentation.md](job_management_documentation.md) | Job posting lifecycle, paginated feed, client/admin management |
| 4 | **Proposal & Application** | [proposal_system_documentation.md](proposal_system_documentation.md) | Bidding workflow, acceptance/rejection, competing proposal logic |
| 5 | **Real-Time Notification** | [notification_system_documentation.md](notification_system_documentation.md) | WebSocket push delivery, persistent inbox, multi-tab support |
| 6 | **Moderation & Reporting** | [moderation_reporting_documentation.md](moderation_reporting_documentation.md) | User report submission, admin review, n8n escalation |
| 7 | **Admin Dashboard** | [admin_dashboard_documentation.md](admin_dashboard_documentation.md) | Platform statistics, user/job/proposal management, cascade deletes |
| 8 | **N8N Automation** | [n8n_automation_documentation.md](n8n_automation_documentation.md) | Email verification, report alert workflows via webhooks |
| 9 | **AI Chatbot** | [chatbot_system_documentation.md](chatbot_system_documentation.md) | Role-aware LLM assistant with scoped database context |
| 10 | **User Profile** | [user_profile_documentation.md](user_profile_documentation.md) | Profile editing, photo upload, static file serving |
| 11 | **Frontend UI** | [frontend_ui_documentation.md](frontend_ui_documentation.md) | Angular SPA architecture, routing, interceptors, dashboards |

---

## System Interaction Matrix

| System → | Auth | DB | Jobs | Proposals | Notifications | Reports | Admin | n8n | Chatbot |
|---|---|---|---|---|---|---|---|---|---|
| **Auth** | — | ✓ | — | — | — | — | — | ✓ | — |
| **Jobs** | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — |
| **Proposals** | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | — |
| **Notifications** | ✓ | ✓ | — | — | — | — | — | — | — |
| **Reports** | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — |
| **Admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — |
| **Chatbot** | — | ✓ | ✓ | ✓ | — | ✓ | — | — | — |
| **User Profile** | ✓ | ✓ | — | — | — | — | — | — | — |
| **n8n** | — | — | — | — | — | — | — | — | — |

---

## Technology Stack Summary

### Backend
| Technology | Version / Detail |
|---|---|
| Language | Python 3.x |
| Framework | FastAPI |
| ORM | SQLAlchemy |
| Database | MySQL (via PyMySQL) |
| Auth | JWT (`python-jose`) + bcrypt (`passlib`) |
| WebSocket | FastAPI native WebSocket |
| HTTP client | `httpx` (n8n) + `requests` (chatbot) |
| Migrations | Alembic |
| Config | `python-dotenv` |

### Frontend
| Technology | Version / Detail |
|---|---|
| Framework | Angular 21 |
| Language | TypeScript 5.9 |
| HTTP | `@angular/common/http` |
| Routing | `@angular/router` |
| Reactive | RxJS 7.8 |
| Styling | Vanilla CSS |
| Build | Angular CLI (esbuild) |

### External Services
| Service | Purpose |
|---|---|
| n8n (self-hosted) | Email automation workflows |
| OpenRouter / GPT-4o-mini | AI chatbot inference |
| MySQL | Primary relational database |

---

## Key Architectural Decisions

1. **Layered service architecture**: Business logic is separated into `services/` classes, keeping routers thin and focused on HTTP concerns.
2. **FastAPI dependency injection**: `Depends()` chains enforce authentication and role checking uniformly across all endpoints.
3. **Synchronous n8n integration**: n8n is triggered via blocking HTTP calls, keeping deployment simple at the cost of request latency.
4. **In-process WebSocket management**: WebSocket connections are stored in a Python dict in process memory — simple but not horizontally scalable.
5. **Role-scoped chatbot context**: The LLM is given only the data the requesting user is authorized to see, enforcing access control at the prompt level.
6. **Standalone Angular components**: Angular 21's standalone API is used throughout, eliminating `NgModule` boilerplate.

---

## Platform User Roles

| Role | Capabilities |
|---|---|
| `client` | Post jobs, manage own jobs, review/accept/reject proposals, receive notifications |
| `freelancer` | Browse open jobs, submit proposals, track application status, receive notifications |
| `admin` | Full platform visibility, delete any content, review reports, access admin dashboard |

---

*Documentation generated: 2026-05-02 | Hireflow Platform v1.0*
