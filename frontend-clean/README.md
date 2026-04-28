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
- **Home:** Job feed with advanced filtering and search.
- **Dashboards:** Role-specific views for managing jobs, proposals, and system reports.
- **Core Services:** Interceptors for auth and error handling.
