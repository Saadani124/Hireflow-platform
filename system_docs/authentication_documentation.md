# Authentication & Authorization System

## System Name
**Authentication & Authorization System**

---

## Purpose and Responsibilities

The Authentication & Authorization system governs all identity management and access control on the Hireflow platform. Its responsibilities include:

- **User Registration**: Accepting new `client` and `freelancer` sign-ups; blocking direct `admin` registration.
- **Password Security**: Hashing passwords with `bcrypt` before persistence and verifying them on login.
- **JWT Issuance**: Generating signed `HS256` JSON Web Tokens upon successful login.
- **Email Verification**: Issuing single-purpose verification tokens for freelancer accounts and redirecting users after confirmation.
- **Session Management**: Persisting session state in the browser's `localStorage` (frontend-side).
- **Route Protection**: Enforcing authentication and role-based access via Angular route guards.
- **HTTP Interception**: Attaching Bearer tokens to every outbound API request; handling global 401 responses.
- **Dependency Injection**: Providing reusable FastAPI `Depends()` factories that validate tokens and resolve the current user/admin/client/freelancer.

---

## Key Components

### Backend

| File | Role |
|---|---|
| `backend/app/routers/auth.py` | REST endpoints: `/auth/register`, `/auth/login`, `/auth/verify` |
| `backend/app/core/security.py` | Password hashing (`bcrypt`), JWT creation & decoding (`jose`) |
| `backend/app/core/dependencies.py` | FastAPI dependency factories: `get_current_user`, `get_current_admin`, `get_current_client`, `get_current_freelancer` |
| `backend/app/models/user.py` | `User` ORM model: `id`, `name`, `email`, `password_hash`, `role`, `is_verified` |
| `backend/app/schemas/auth.py` | Pydantic schemas: `registerSchema`, `loginSchema` |

### Frontend

| File | Role |
|---|---|
| `frontend-clean/src/app/services/auth.ts` | `AuthService`: API calls, `localStorage` token/user management |
| `frontend-clean/src/app/core/interceptors/auth-interceptor.ts` | `HttpInterceptorFn`: attaches `Authorization: Bearer <token>` header; handles 401 globally |
| `frontend-clean/src/app/core/guards/auth-guard.ts` | `authGuard`: blocks unauthenticated navigation to protected routes |
| `frontend-clean/src/app/core/guards/role-guard.ts` | `roleGuard`: blocks users from accessing routes not matching their role |
| `frontend-clean/src/app/pages/login/` | Login page component |
| `frontend-clean/src/app/pages/register/` | Registration page component |
| `frontend-clean/src/app/pages/verify/` | Email verification landing page |

---

## Architecture Overview

```
[Browser]
   │
   ├── Register → POST /auth/register
   │       └── bcrypt hash → INSERT User (is_verified=False for freelancers)
   │                └──▶ trigger_verification_email() → n8n webhook
   │
   ├── Login → POST /auth/login
   │       └── bcrypt verify → create_access_token() → JWT returned
   │                └── Frontend: saveToken() + saveUser() → localStorage
   │
   ├── Email Verification Link → GET /auth/verify?token=<JWT>
   │       └── decode_access_token() → check purpose="email_verification"
   │                └── User.is_verified = True → RedirectResponse → /login
   │
   └── Subsequent API Requests
           └── auth-interceptor.ts → Authorization: Bearer <token>
                   └── FastAPI Depends(get_current_user) → decode JWT → User row
```

---

## Data Flow

### Registration
1. Client sends `{ name, email, password, role }` to `POST /auth/register`.
2. `auth.py` validates role is `client` or `freelancer` (admin blocked).
3. Checks email uniqueness in `users` table.
4. Password hashed via `hash_password()` (bcrypt).
5. `User` row inserted with `is_verified=True` (client) or `False` (freelancer).
6. For freelancers: `create_verification_token()` generates a 24-hour JWT; `trigger_verification_email()` posts to n8n.

### Login
1. Client sends `{ email, password }` to `POST /auth/login`.
2. User queried from DB; password verified via `verify_password()`.
3. Unverified freelancers receive `403`.
4. On success: `create_access_token({ user_id, role })` returns a 60-minute JWT.
5. Frontend stores token in `localStorage['token']` and user object in `localStorage['user']`.

### Token Validation (Per Request)
1. `auth-interceptor.ts` clones the request, injects `Authorization: Bearer <token>`.
2. FastAPI receives request; `HTTPBearer` scheme extracts token from header.
3. `decode_access_token()` validates signature and expiry (via `python-jose`).
4. `user_id` extracted from payload; `User` row fetched from DB and returned.
5. Role-specific dependencies (`get_current_admin`, etc.) additionally assert `user.role`.

---

## Dependencies

### Internal
- **Database Layer** (`app/db/session.py`) — session injection via `Depends(get_db)`
- **User Model** (`app/models/user.py`) — persists and queries user records
- **n8n Automation System** (`app/core/n8n.py`) — triggers verification email workflow

### External
| Library | Purpose |
|---|---|
| `passlib[bcrypt]` v1.7.4 / `bcrypt` v4.0.1 | Password hashing and verification |
| `python-jose[cryptography]` | JWT creation (`jwt.encode`) and decoding (`jwt.decode`) |
| `python-dotenv` | Loads `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` from `.env` |
| `@angular/common/http` | `HttpClient`, `HttpInterceptorFn` |
| `@angular/router` | `CanActivateFn`, `Router` (for guards) |

---

## Technologies Used

| Layer | Technology |
|---|---|
| Backend framework | FastAPI (Python) |
| Password hashing | bcrypt (via passlib) |
| Token standard | JWT / HS256 |
| Token library | python-jose |
| Frontend framework | Angular 21 |
| Frontend state | `localStorage` (no external state manager) |
| HTTP security | Bearer token scheme (`HTTPBearer`) |

---

## Key Algorithms & Logic

### JWT Payload Structure
```json
{
  "user_id": 42,
  "role": "freelancer",
  "exp": "<UTC timestamp>"
}
```

### Verification Token Payload Structure
```json
{
  "user_id": 42,
  "purpose": "email_verification",
  "exp": "<UTC + 24h>"
}
```

### Role Derivation (Backend)
The `dependencies.py` file provides a dependency chain:
```
get_current_user()  →  base identity (any authenticated user)
    ├── get_current_admin()     → asserts role == "admin"
    ├── get_current_client()    → asserts role == "client"
    └── get_current_freelancer() → asserts role == "freelancer"
```
Any role mismatch raises `HTTP 403 Unauthorized`.

### Frontend Role Derivation
`role-guard.ts` reads the `user` object from `localStorage` and compares `user.role` against `route.data.role`. If mismatched, the user is redirected to `/home`.

---

## Integration Points

| System | Integration |
|---|---|
| **n8n Automation** | `trigger_verification_email()` called in `POST /auth/register` for freelancers |
| **Job Management** | All job endpoints use `get_current_client` or `get_current_user` from this system |
| **Proposal System** | `get_current_freelancer` and `get_current_client` guard proposal endpoints |
| **Admin Panel** | `get_current_admin` restricts all `/admin/*` endpoints |
| **Notification System** | Notifications are user-scoped via `user_id` resolved by this system |
| **Chatbot System** | User identity (`user_id`, `role`, `name`) passed in the `ChatRequest` payload |
| **User Profile** | `GET /users/me`, `PUT /users/me` rely on `get_current_user` |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **No token revocation** | JWTs are stateless; there is no refresh token or blocklist. A logged-out token remains valid until expiry (60 min). |
| **`localStorage` storage** | Tokens are stored in `localStorage`, which is vulnerable to XSS attacks. `HttpOnly` cookies would be more secure. |
| **Hardcoded SECRET_KEY** | The `.env` file contains `supersecretkey` — a weak, predictable secret. A cryptographically random key must be used in production. |
| **CORS wildcard** | `allow_origins=["*"]` in `main.py` allows any origin to call the API. Should be restricted to the frontend domain. |
| **Client auto-verification** | Clients are marked `is_verified=True` at registration without any confirmation step, which reduces identity assurance. |
| **Frontend role enforcement** | Role is derived from `localStorage`, which can be tampered by the user. Backend dependency checks are the true enforcement layer. |
| **No password reset** | There is no "forgot password" flow implemented. |
| **API key in `.env` committed** | The `OPENROUTER_API_KEY` in `.env` is a secret that should never be committed to version control. |
