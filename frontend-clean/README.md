# Hireflow Frontend

Modern Angular frontend for the Hireflow platform.

## 🛠️ Setup
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Environment Configuration:**
   Ensure `src/app/core/api.config.ts` (or equivalent) points to your backend URL (default: `http://localhost:8000`).
3. **Start Development Server:**
   ```bash
   ng serve
   ```
   Navigate to `http://localhost:4200/`.

## 🎨 Design System
- **Glassmorphism:** Suble blurs and gradients.
- **Micro-animations:** Smooth transitions for hover effects and modals.
- **Responsiveness:** Optimized for various screen sizes.

## 📂 Core Components
- **Home:** Job feed with server-side pagination and real-time alerts.
- **Dashboards:** Role-specific views with WebSocket-driven notification panels.
- **Notification System:** Global real-time stream via persistent WebSocket connection.
- **Search & Pagination:** Optimized data fetching for jobs and proposals across all sections.
- **Core Services:** Interceptors for JWT auth, error handling, and real-time state management.
