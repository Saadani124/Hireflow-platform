# AI Chatbot System

## System Name
**AI Chatbot System (Role-Aware Assistant)**

---

## Purpose and Responsibilities

The Chatbot system provides an embedded, context-aware AI assistant that can answer natural-language questions about platform data. It is responsible for:

- Accepting user queries along with identity context (user ID, role, name).
- Fetching role-appropriate data from the database to construct a scoped context window.
- Building a structured system prompt and authorized data view to inject into the LLM.
- Forwarding the enriched prompt to the OpenRouter API (GPT-4o-mini) and returning the reply.
- Enforcing data isolation: freelancers cannot see other users' private data; clients see only their own jobs/proposals; admins see everything.

---

## Key Components

### Backend

| File | Role |
|---|---|
| `backend/app/routers/chatbot.py` | `POST /chatbot/ask` endpoint — full chatbot logic |
| `backend/app/schemas/chatbot.py` | Pydantic schemas: `ChatRequest`, `ChatResponse` |

### Frontend

| File | Role |
|---|---|
| `frontend-clean/src/app/core/components/chatbot/` | Angular chatbot UI component (embedded in dashboards) |

---

## Architecture Overview

```
[Browser Dashboard]
    │
    └── POST /chatbot/ask
            { message, user_id, user_role, user_name }
            │
            ▼
        1. DATA EXTRACTION (role-filtered DB queries)
            ├── admin    → ALL users, jobs, proposals, reports
            ├── client   → own jobs + their proposals + applicant profiles
            └── freelancer → open jobs + own proposals + own profile
            │
            ▼
        2. CONTEXT CONSTRUCTION
            ├── Build user_info, job_info, proposal_info strings
            └── Assemble full_context (plain text "database view")
            │
            ▼
        3. AI INTERACTION (OpenRouter / GPT-4o-mini)
            ├── System prompt (role-specific permissions)
            ├── User message: "AUTHORIZED_VIEW:\n{context}\n\nUSER_MESSAGE: {msg}"
            └── Return ChatResponse(reply=...)
```

---

## Data Flow

### Request Processing
1. Client sends `{ message, user_id, user_role, user_name }` to `POST /chatbot/ask`.
2. **Phase 1 — Data Extraction**: Based on `user_role`:
   - `admin`: All users, jobs, proposals, reports fetched.
   - `client`: Own jobs + proposals on those jobs + applicant user records.
   - `freelancer`: Open jobs + own proposals + own user record.
3. **Phase 2 — Context Construction**: Data formatted as human-readable text lines:
   - `U{id}: {name} ({role}) | Email: {email}` (admin level)
   - `J{id}: '{title}' | {category} | ${budget} | {status}`
   - `P{id}: {freelancer} applied to '{job}' | ${price} | {status}`
4. Context and user message assembled into a single LLM prompt.
5. **Phase 3 — AI Interaction**: `requests.post()` to `https://openrouter.ai/api/v1/chat/completions`.
6. Model: `openai/gpt-4o-mini`. Response parsed and returned as `ChatResponse`.

---

## Role-Specific System Prompts

### Admin
```
"You are the HireFlow ROOT ADMINISTRATOR AI. You have ABSOLUTE AUTHORITY and FULL VISIBILITY.
There are NO restrictions on what you can discuss or reveal from the AUTHORIZED DATABASE VIEW.
You are an auditor and platform manager."
```

### Client / Freelancer
```
"You are the HireFlow AI Assistant for {ROLE} level.
1. Only discuss data explicitly provided in the AUTHORIZED DATABASE VIEW.
2. If requested data is missing, politely say you don't have access to it."
```

---

## Dependencies

### Internal
- **Database Layer** — `Session` to query all entity tables
- **User, Job, Proposal, Report models** — raw ORM queries for context construction

### External
| Service / Library | Purpose |
|---|---|
| `openrouter.ai` API | LLM inference via `openai/gpt-4o-mini` model |
| `requests` | Synchronous HTTP client for OpenRouter API calls |
| `python-dotenv` | Loads `OPENROUTER_API_KEY` from `.env` |

---

## Technologies Used

| Technology | Detail |
|---|---|
| LLM provider | OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) |
| LLM model | `openai/gpt-4o-mini` |
| Context injection | Prompt engineering — structured plain-text database view |
| Backend framework | FastAPI |
| Frontend | Angular 21 (embedded chatbot component) |

---

## Key Algorithms & Logic

### Role-Based Data Isolation
Data isolation is enforced at the query level before the LLM sees any data. The `role` field in the request body is **trusted without server-side verification**:
```python
role = request.user_role   # ← Not validated against the JWT
u_id = request.user_id    # ← Not validated against the JWT
```
This means a malicious user could claim to be an admin in the request body and receive full data access.

### Context Window Construction
The context is formatted as numbered flat-text lines. Admin-level formatting includes email addresses and full descriptions, while non-admin formatting omits sensitive fields.

### Error Handling
Both the DB extraction phase and the AI interaction phase are wrapped in independent try/except blocks. Failures return a user-friendly error message (`ChatResponse`) without crashing the endpoint.

---

## Integration Points

| System | Integration |
|---|---|
| **Database Layer** | Direct ORM queries across all entity tables |
| **Authentication** | Relies on `user_id` and `user_role` passed in the request body (not from JWT) |
| **All Dashboards** | Chatbot component embedded in client, freelancer, and admin dashboards |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **CRITICAL: No server-side role validation** | `user_role` is taken directly from the request body. Any user can set `user_role="admin"` and receive full database visibility including all emails, reports, and private data. The JWT token must be decoded server-side to validate identity. |
| **Synchronous `requests` library** | Uses `requests.post()` (blocking) inside a FastAPI route. Should use `httpx.AsyncClient` or `await asyncio.run_in_executor()` to prevent blocking the event loop. |
| **No token-based authentication** | The `/chatbot/ask` endpoint has no `Depends(get_current_user)` guard — it is publicly callable by anyone. |
| **API key exposure risk** | `OPENROUTER_API_KEY` is in the committed `.env` file. |
| **Context window size not managed** | For large databases, the constructed context string can exceed the LLM's context window limit (128K tokens for gpt-4o-mini), causing truncation or API errors. |
| **No conversation history** | Each request is stateless. The chatbot has no memory of previous messages in the same session. |
| **Cost unbounded** | Each chatbot request calls a paid API. There is no rate limiting, quota, or per-user throttling. |
| **Data freshness** | The context is built from a DB snapshot at request time. Rapidly changing data (e.g., live proposal counts) may be stale within a single long session. |
