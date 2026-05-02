# Real-Time Notification System

## System Name
**Real-Time Notification System (WebSocket + REST)**

---

## Purpose and Responsibilities

The Notification system delivers event-driven, real-time alerts to users of the Hireflow platform. It is responsible for:

- **Persistent storage**: Saving notification records to the database so users can retrieve them after reconnecting.
- **Real-time push delivery**: Immediately broadcasting notifications to connected users via WebSocket.
- **User inbox management**: Providing a paginated notification feed with read/unread state.
- **Unread count**: Supplying a badge counter for the frontend notification bell.
- **Read/delete management**: Allowing users to mark individual or all notifications as read, and delete entries.
- **Event sourcing**: Receiving notification creation requests from other services (Proposal, Report, Admin).

---

## Key Components

### Backend

| File | Role |
|---|---|
| `backend/app/core/websocket_manager.py` | `ConnectionManager` — manages live WebSocket connections per user |
| `backend/app/services/notification_service.py` | `NotificationService` — CRUD operations + WebSocket broadcast |
| `backend/app/routers/notification.py` | REST + WebSocket endpoints at `/notifications/*` |
| `backend/app/models/notification.py` | `Notification` ORM model |
| `backend/app/schemas/notification.py` | Pydantic schemas: `NotificationResponse`, `UnreadCountResponse` |

### Frontend

| File | Role |
|---|---|
| `frontend-clean/src/app/services/notification.ts` | `NotificationService` — REST + WebSocket client |
| Dashboard components | All three dashboards (client, freelancer, admin) subscribe to the notification stream |

---

## Architecture Overview

```
                         ┌─────────────────────────────────────┐
                         │           Backend (FastAPI)          │
                         │                                      │
  Business Event         │  ProposalService ──┐                 │
  (apply/accept/         │  ReportService  ──►│ NotificationService.create_notification()
   admin-delete)         │  AdminService   ──┘        │         │
                         │                             │         │
                         │              ┌──────────────┤         │
                         │              │   DB Insert  │         │
                         │              │  (notifications table) │
                         │              │              │         │
                         │              └──────────────┤         │
                         │                             │         │
                         │         ConnectionManager.send_personal_message()
                         │                             │         │
                         └─────────────────────────────┼─────────┘
                                                        │
                                              WebSocket push (JSON)
                                                        │
                         ┌─────────────────────────────▼─────────┐
                         │            Browser (Angular)           │
                         │                                        │
                         │  NotificationService                   │
                         │    .connectWebSocket(token)            │
                         │    .realtimeSubject (RxJS Subject)     │
                         │           │                            │
                         │  Dashboard components                  │
                         │    .getRealtimeStream().subscribe()    │
                         └────────────────────────────────────────┘
```

---

## Data Flow

### Notification Creation (Internal API)
1. A service (ProposalService, ReportService, AdminService) calls:
   ```python
   await NotificationService.create_notification(db, user_id, type, title, message, link)
   ```
2. A `Notification` row is inserted into the database.
3. The notification is serialized to a dict.
4. `manager.send_personal_message(notif_dict, user_id)` is called.
5. The `ConnectionManager` iterates over all active WebSocket connections for `user_id` and sends the JSON payload.

### WebSocket Handshake
1. Frontend calls `connectWebSocket(token)`.
2. A `WebSocket` is opened to `ws://localhost:8000/notifications/ws?token=<JWT>`.
3. Backend `websocket_endpoint` decodes the token to extract `user_id`.
4. Invalid token → `websocket.close(code=1008)`.
5. Valid: `manager.connect(websocket, user_id)` registers the connection.
6. The server loops `await websocket.receive_text()` to keep the connection alive.
7. On disconnect: `manager.disconnect(websocket, user_id)` cleans up.

### REST Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `GET /notifications/` | GET | Paginated notification list for current user |
| `GET /notifications/unread-count` | GET | Count of unread notifications |
| `PATCH /notifications/{id}/read` | PATCH | Mark one notification as read |
| `PATCH /notifications/read-all` | PATCH | Mark all notifications as read |
| `DELETE /notifications/{id}` | DELETE | Delete a notification |
| `WS /notifications/ws?token=` | WebSocket | Real-time stream |

### Frontend RxJS Pipeline
```typescript
// Connect on dashboard init
this.notifService.connectWebSocket(token);

// Subscribe to real-time stream
this.notifService.getRealtimeStream().subscribe(notif => {
  this.notifications.unshift(notif);
  this.unreadCount++;
});
```

---

## Notification Types

| `type` value | Triggered By | Recipient |
|---|---|---|
| `new_proposal` | Freelancer applies to a job | Client (job owner) |
| `accepted` | Client accepts a proposal | Freelancer |
| `deleted_job` | Admin deletes a job | Client |
| `deleted_proposal` | Admin deletes a proposal | Freelancer |
| `report_job` | Any user reports a job | All admins |
| `report_proposal` | Any user reports a proposal | All admins |

---

## Dependencies

### Internal
- **Authentication** — WebSocket endpoint decodes JWT to identify user; REST endpoints use `get_current_user`
- **Database Layer** — `Session` for notification persistence
- **Proposal System** — calls `create_notification` on apply/accept events
- **Report/Moderation** — calls `create_notification` for all admin users on every report
- **Admin System** — calls `create_notification` on job/proposal/user deletion

### External
| Library | Purpose |
|---|---|
| `fastapi.WebSocket`, `WebSocketDisconnect` | WebSocket server primitives |
| `asyncio` | Async execution of `create_notification` |
| `rxjs Subject` | RxJS observable stream for real-time events in Angular |

---

## Technologies Used

| Technology | Detail |
|---|---|
| WebSocket protocol | Native FastAPI WebSocket support |
| In-memory connection registry | Python `Dict[int, List[WebSocket]]` (no broker) |
| Database persistence | MySQL `notifications` table via SQLAlchemy |
| Frontend streaming | RxJS `Subject` exposed as `Observable` |
| Token auth (WebSocket) | JWT passed as query parameter `?token=` |

---

## Key Algorithms & Logic

### ConnectionManager
```python
class ConnectionManager:
    active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket, user_id):
        await websocket.accept()
        self.active_connections[user_id].append(websocket)

    async def send_personal_message(self, message, user_id):
        for connection in self.active_connections.get(user_id, []):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection, user_id)
```

Multi-tab support is inherent: a single `user_id` maps to a **list** of WebSocket connections. All tabs receive the push simultaneously. Dead connections are pruned on send failure.

---

## Integration Points

| System | Integration |
|---|---|
| **Proposal System** | Fires `new_proposal` (to client) and `accepted` (to freelancer) |
| **Report/Moderation** | Fires `report_job` / `report_proposal` to all admin accounts |
| **Admin System** | Fires `deleted_job` / `deleted_proposal` to affected users |
| **Authentication** | JWT used to authenticate WebSocket connections |
| **All Dashboards** | Subscribe to WebSocket stream for badge updates and inbox UI |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **In-memory connection store** | `active_connections` is a dict in process memory. Multi-worker deployments (e.g. multiple Uvicorn workers) will not share state — connections on worker A cannot receive messages sent by worker B. A Redis pub/sub or similar broker is required for horizontal scaling. |
| **No offline delivery guarantee** | If a user is not connected at the time of a notification event, they only receive it via the database REST endpoint on next load — no push retry. |
| **Token in URL query string** | The JWT is visible in browser history and server logs when passed as `?token=`. A more secure approach is token exchange over the first WebSocket message. |
| **Admin fan-out is unbounded** | Every report sends a notification to ALL admin users via individual DB inserts and WebSocket pushes. As the admin count grows, this becomes expensive. |
| **No notification expiry/cleanup** | Notifications are never automatically purged. The `notifications` table will grow indefinitely. |
| **RxJS Subject has no replay** | If a component subscribes after a notification arrives, it misses it. A `BehaviorSubject` or `ReplaySubject` would provide late-subscriber delivery. |
