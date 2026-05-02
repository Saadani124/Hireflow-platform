# Frontend UI System

## System Name
**Frontend User Interface System (Angular SPA)**

---

## Purpose and Responsibilities

The Frontend UI system is the Angular 21 single-page application that serves as the user-facing layer of the Hireflow platform. It is responsible for:

- Providing role-differentiated views for clients, freelancers, and administrators.
- Managing client-side routing with authentication and role-based route guards.
- Injecting JWT Bearer tokens into all HTTP requests via an interceptor.
- Rendering the job marketplace, proposal workflows, notification inbox, and AI chatbot.
- Managing user profile (view, edit, upload profile picture).
- Subscribing to real-time WebSocket notifications and updating UI state.

---

## Key Components

### Entry Points & Configuration

| File | Role |
|---|---|
| `frontend-clean/src/index.html` | HTML shell, Angular bootstrap point |
| `frontend-clean/src/main.ts` | Angular application bootstrap |
| `frontend-clean/src/app/app.ts` | Root `AppComponent` |
| `frontend-clean/src/app/app.config.ts` | Provides `HttpClient`, router, interceptors |
| `frontend-clean/src/app/app.routes.ts` | All application routes |
| `frontend-clean/src/styles.css` | Global styles |

### Pages / Views

| Page | Route | Role |
|---|---|---|
| `welcome/` | `/` | Public landing page |
| `login/` | `/login` | Public login form |
| `register/` | `/register` | Public registration form |
| `verify/` | `/verify?token=` | Email verification landing |
| `home/` | `/home` | Authenticated job marketplace |
| `client-dashboard/` | `/ClientDashboard` | Client-only dashboard |
| `freelancer-dashboard/` | `/FreelancerDashboard` | Freelancer-only dashboard |
| `admin-dashboard/` | `/AdminDashboard` | Admin-only dashboard |

### Services (Frontend API Layer)

| Service | Purpose |
|---|---|
| `services/auth.ts` | Login, register, token/user localStorage management |
| `services/job.ts` | Job CRUD and listing |
| `services/proposal.ts` | Proposal submission, acceptance, rejection |
| `services/notification.ts` | Notification REST + WebSocket client |
| `services/admin.ts` | Admin statistics, user/job/proposal management |
| `services/report.ts` | Report submission and admin retrieval |

### Core Infrastructure

| File | Role |
|---|---|
| `core/guards/auth-guard.ts` | Blocks unauthenticated access |
| `core/guards/role-guard.ts` | Blocks access to wrong-role routes |
| `core/interceptors/auth-interceptor.ts` | Injects Bearer token; handles global 401 |
| `core/components/chatbot/` | Embedded AI chatbot widget |
| `core/categories.ts` | Static job category list |

### Models (Frontend TypeScript Interfaces)

| File | Interfaces |
|---|---|
| `models/user.ts` | User interface |
| `models/job.ts` | Job interface |
| `models/proposal.ts` | Proposal interface |

---

## Architecture Overview

```
Browser
  │
  ▼
index.html → main.ts → AppComponent → RouterOutlet
                                          │
                              ┌───────────┼────────────────────────────┐
                              │           │                            │
                           Public     Authenticated               Role-Gated
                         (welcome,   (home + authGuard)     (dashboards + roleGuard)
                          login,                                       │
                          register,                    ┌──────────────┼──────────────┐
                          verify)                      │              │              │
                                                 ClientDashboard  Freelancer   AdminDashboard
                                                                  Dashboard

All authenticated routes:
  HTTP Request → auth-interceptor → adds "Authorization: Bearer <token>"
             ← HTTP Response ← API (FastAPI backend at localhost:8000)

WebSocket: NotificationService → ws://localhost:8000/notifications/ws?token=<JWT>
```

---

## Data Flow

### Application Bootstrap
1. `main.ts` calls `bootstrapApplication(App, appConfig)`.
2. `appConfig` registers `provideHttpClient(withInterceptors([authInterceptor]))` and `provideRouter(routes)`.
3. `AppComponent` renders `<router-outlet>`.
4. Angular Router matches URL to the appropriate component.

### Page Load (Dashboard)
1. Route guard checks `localStorage['token']` (authGuard) and `localStorage['user'].role` (roleGuard).
2. Dashboard component initializes and fires service calls.
3. `auth-interceptor` attaches the Bearer token to all HTTP calls.
4. `NotificationService.connectWebSocket(token)` establishes the WebSocket.
5. Component subscribes to `getRealtimeStream()` to update the notification badge and inbox in real time.

### Token / Session State
- `token` → `localStorage['token']` (raw JWT string)
- `user` → `localStorage['user']` (JSON serialized user object)
- On `HTTP 401` response: `auth-interceptor` clears `localStorage` and redirects to `/login`.
- On logout: `AuthService.logout()` removes both keys.

---

## Dependencies

### Internal
- All pages consume services from `frontend-clean/src/app/services/`
- Guards and interceptors are registered in `app.config.ts`

### External
| Library | Version | Purpose |
|---|---|---|
| `@angular/core` | 21.2.x | Framework, DI, change detection |
| `@angular/router` | 21.2.x | SPA routing, lazy loading, guards |
| `@angular/common/http` | 21.2.x | `HttpClient`, interceptors |
| `@angular/forms` | 21.2.x | Template-driven and reactive forms |
| `rxjs` | 7.8.x | Observables, `Subject`, `forkJoin` |
| `typescript` | 5.9.x | Type safety |

---

## Technologies Used

| Technology | Detail |
|---|---|
| Framework | Angular 21 (standalone components API) |
| Language | TypeScript 5.9 |
| Styling | Vanilla CSS (per-component styles + global `styles.css`) |
| State management | Component-local state + `localStorage` for session |
| HTTP | Angular `HttpClient` with functional interceptors |
| Real-time | Native WebSocket API |
| Reactive programming | RxJS Observables and Subjects |
| Build tooling | Angular CLI, `@angular/build` (esbuild-based) |
| Package manager | npm 11.6.x |

---

## Key Algorithms & Logic

### Notification Badge Real-Time Update
```typescript
this.notifService.connectWebSocket(token);
this.notifService.getRealtimeStream().subscribe(notif => {
  this.notifications.unshift(notif);
  this.unreadCount++;
});
```
The `unshift()` prepends the new notification to the top of the list without re-fetching.

### 401 Auto-Logout
```typescript
catchError((error) => {
  if (error.status === 401) {
    localStorage.clear();
    router.navigate(['/login']);
  }
  return throwError(() => error);
})
```

### Route Alias System
Several route aliases are defined in `app.routes.ts` to support notification deep-links:
```typescript
{ path: 'admin', redirectTo: 'AdminDashboard' },
{ path: 'client-dashboard', redirectTo: 'ClientDashboard' },
```
This allows notification `link` values (e.g. `/admin?section=reports`) to resolve correctly.

---

## Integration Points

| System | Integration |
|---|---|
| **Authentication** | `AuthService` manages tokens; guards enforce route access |
| **Job Management** | Home page and dashboards consume `JobService` |
| **Proposal System** | Client and freelancer dashboards consume `ProposalService` |
| **Notification System** | All dashboards connect WebSocket and poll unread count |
| **Admin Dashboard** | Consumes `AdminService`, `ReportService` |
| **Chatbot** | Embedded in dashboards via chatbot component |
| **Backend API** | All HTTP calls go to `http://localhost:8000` (hardcoded) |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **Hardcoded API URLs** | Every service hardcodes `http://localhost:8000`. There is no environment variable system (`environment.ts` files) for multi-environment deployments. |
| **localStorage for auth** | Susceptible to XSS. `HttpOnly` cookie sessions are the industry standard for token security. |
| **No lazy loading** | All page components are eagerly loaded. Large dashboards (admin: 19KB TS, 30KB HTML) inflate the initial bundle. |
| **No state management library** | Complex shared state (notification counts, user data) is managed ad-hoc with component variables and `localStorage`. NgRx or a signal-based store would improve consistency. |
| **Role derived from localStorage** | `roleGuard` reads `user.role` from `localStorage`, which can be tampered in DevTools. Backend is the authoritative source of role. |
| **No form validation library** | Form validation is done via template `required` attributes with no unified validation strategy. |
| **No unit or integration tests** | `vitest` is in devDependencies but no test files are present in the codebase. |
| **WebSocket not reconnected** | If the WebSocket disconnects (network interruption), there is no auto-reconnect logic. |
