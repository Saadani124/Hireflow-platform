# Hireflow Backend

FastAPI-powered backend for the Hireflow platform.

## 🛠️ Setup
1. **Create Virtual Environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Configure Environment:**
   Update `.env` with your MySQL credentials:
   ```env
   DATABASE_URL=mysql+pymysql://root:@localhost:3306/hireflow
   SECRET_KEY=your_secret_key
   ```
4. **Run Migrations/Seed (Optional):**
   ```bash
   python seed_v2.py
   ```
5. **Start Server:**
   ```bash
   uvicorn app.main:app --reload
   ```

## 📡 API Endpoints
- `/auth`: Login, Registration, and Email Verification.
- `/jobs`: Job listing, creation, and status management.
- `/proposals`: Proposal submission, acceptance, and rejection.
- `/reports`: Community reporting system with admin alerts.
- `/notifications`: HTTP endpoints and **WebSocket** (`/notifications/ws`) for real-time updates.
- `/admin`: Platform-wide statistics and moderation tools.

## 🏗️ Architecture
The backend is organized into a **Service Layer** pattern:
- `app/services/`: Contains business logic and notification triggers.
- `app/routers/`: Slim controllers that handle HTTP requests.
- `app/core/websocket_manager.py`: Manages real-time bi-directional communication.

## 🧪 Development
- The project uses **Pydantic v2** and **SQLAlchemy**.
- Ensure **CORS** is configured in `main.py` to allow the frontend origin.
