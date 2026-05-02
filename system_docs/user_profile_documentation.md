# User Profile System

## System Name
**User Profile & File Management System**

---

## Purpose and Responsibilities

The User Profile system manages personal identity data for all registered users on the platform. Its responsibilities include:

- Serving the current authenticated user's profile data.
- Allowing users to update their display name and email address.
- Accepting, validating, and storing profile picture uploads.
- Serving uploaded image files as static assets.
- Cleaning up old profile pictures on replacement.

---

## Key Components

### Backend

| File | Role |
|---|---|
| `backend/app/routers/user.py` | REST router for `/users/*` endpoints |
| `backend/app/models/user.py` | `User` ORM model (name, email, profile_image) |
| `backend/app/schemas/user.py` | Pydantic schema: `UpdateProfileRequest` |
| `backend/uploads/` | Filesystem directory for uploaded profile images |
| `backend/app/main.py` (line 40) | `app.mount("/uploads", StaticFiles(...))` — serves images as static files |

### Frontend

| File | Role |
|---|---|
| `frontend-clean/src/app/services/auth.ts` | `getMe()`, `uploadProfilePicture()`, `updateProfile()` |
| Dashboard components | Profile sections in client, freelancer, and admin dashboards |

---

## Architecture Overview

```
[Browser]
    │
    ├── GET /users/me
    │       └── Returns current user row (role, name, email, profile_image, is_verified)
    │
    ├── POST /users/upload-profile-picture (multipart/form-data)
    │       ├── Validate file.content_type starts with "image/"
    │       ├── Delete old file from disk (if not default.png)
    │       ├── Generate UUID-based filename
    │       ├── Save to /uploads/{uuid}.{ext}
    │       ├── UPDATE users.profile_image = "/uploads/{filename}"
    │       └── Return { image_url: "/uploads/{filename}" }
    │
    ├── PUT /users/me { name, email }
    │       ├── Check email uniqueness (exclude self)
    │       ├── UPDATE users.name, users.email
    │       └── Return updated User
    │
    └── GET /uploads/{filename}   (Static file server)
            └── Served directly by FastAPI StaticFiles middleware
```

---

## Data Flow

### Profile Picture Upload
1. User selects an image file in the dashboard UI.
2. Frontend creates a `FormData` object with the file appended as `"file"`.
3. `POST /users/upload-profile-picture` is called with `multipart/form-data`.
4. Backend validates MIME type (must start with `"image/"`).
5. If the user has a non-default profile image, the old file is deleted from disk.
6. A `uuid4()` filename with original extension is generated to prevent name collisions.
7. File is written using `shutil.copyfileobj(file.file, buffer)`.
8. `User.profile_image` updated to `"/uploads/{filename}"`.
9. Frontend receives `{ image_url }` and updates the displayed avatar.

### Profile Update
1. User submits `{ name, email }` via `PUT /users/me`.
2. Backend checks for email conflicts: `WHERE email = data.email AND id != user.id`.
3. Name and email updated in-place.
4. Full updated `User` object returned.

---

## Dependencies

### Internal
- **Authentication** — `get_current_user` validates and injects the current user for all endpoints
- **Database Layer** — `Session` for reading and updating the `User` record

### External
| Library | Purpose |
|---|---|
| `shutil.copyfileobj` | Streams file upload to disk |
| `uuid4` | Generates unique filenames |
| `fastapi.staticfiles.StaticFiles` | Serves `/uploads/` directory as static HTTP assets |
| `os` | File existence checks, directory creation |

---

## Technologies Used

| Technology | Detail |
|---|---|
| File storage | Local filesystem (`backend/uploads/`) |
| Static serving | FastAPI `StaticFiles` middleware |
| Upload format | `multipart/form-data` via `UploadFile` |
| Filename strategy | UUID v4 to prevent collisions and enumeration |

---

## Key Algorithms & Logic

### Default Image Preservation
```python
DEFAULT_IMAGE = "/uploads/default.png"
if user.profile_image and user.profile_image != DEFAULT_IMAGE:
    old_path = user.profile_image.lstrip("/")
    if os.path.exists(old_path):
        os.remove(old_path)
```
The default profile image is never deleted. Only custom images uploaded by the user are cleaned up on replacement.

### UUID Filename Generation
```python
filename = f"{uuid4()}.{ext}"
```
This prevents directory traversal attacks (no user-controlled path) and filename collisions.

---

## Integration Points

| System | Integration |
|---|---|
| **Authentication** | `get_current_user` resolves user identity for all profile endpoints |
| **Database Layer** | Reads and updates the `users` table |
| **All Dashboards** | Profile sections in client, freelancer, and admin dashboards call `GET /users/me` on init |

---

## Potential Weaknesses & Limitations

| Weakness | Detail |
|---|---|
| **Local filesystem storage** | Uploaded files are stored on the server's local disk. In a multi-server deployment, files will not be available on other instances. A shared store (S3, MinIO, Azure Blob) is required for production. |
| **No file size limit** | There is no maximum file size check. A user could upload a very large file. FastAPI's default body size limit applies but is configurable. |
| **MIME type validation only** | Validation is `content_type.startswith("image/")`, which can be spoofed by a crafted HTTP request. A true magic-byte validation (e.g., `python-magic`) should be used in production. |
| **Synchronous file I/O** | `shutil.copyfileobj()` is blocking. In an async FastAPI context, this blocks the event loop during upload. `aiofiles` should be used. |
| **Extension from filename** | `ext = file.filename.split('.')[-1]` is user-controlled. A malicious user could set `ext="php"` or similar (though no server-side execution is configured). Should be derived from MIME type. |
| **No image resizing/optimization** | Uploaded images are stored at their original resolution. Large images can slow page loads and consume significant disk space. |
| **No CDN** | Profile images are served directly from the FastAPI process, adding load to the application server. |
