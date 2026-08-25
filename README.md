# 🚀 HireFlow Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![OpenRouter AI](https://img.shields.io/badge/OpenRouter%20AI-7C3AED?style=for-the-badge&logo=openai&logoColor=white)](https://openrouter.ai/)

**HireFlow** is a premium, AI-powered freelancer marketplace designed for high-performance talent matching. It combines a high-end **Angular** frontend with a robust **FastAPI** backend, featuring context-aware AI assistants, real-time communication, and automated workflows.

<p align="center">
  <img src="docs/screenshots/login.png" alt="HireFlow — Premium Freelance Marketplace" width="100%">
</p>

---

## 🖥️ Product Tour

A guided visual walkthrough of HireFlow across every role of the marketplace.

### 🛡️ Admin Console

Full platform oversight — user management, moderation, and proposal governance.

<table>
  <tr>
    <td width="50%" align="center">
      <img src="docs/screenshots/admin-dashboard.png" alt="Admin Dashboard" width="100%"><br>
      <sub><b>Admin Dashboard</b></sub>
    </td>
    <td width="50%" align="center">
      <img src="docs/screenshots/manage-users.png" alt="Manage Users" width="100%"><br>
      <sub><b>Manage Users</b></sub>
    </td>
  </tr>
  <tr>
    <td colspan="2" align="center">
      <img src="docs/screenshots/handle-proposals.png" alt="Handle Proposals" width="100%"><br>
      <sub><b>Handle Proposals</b></sub>
    </td>
  </tr>
</table>

### 💼 Client Workspace

Post jobs, review incoming proposals, and scout top talent.

<table>
  <tr>
    <td width="50%" align="center">
      <img src="docs/screenshots/client-dashboard.png" alt="Client Dashboard" width="100%"><br>
      <sub><b>Client Dashboard</b></sub>
    </td>
    <td width="50%" align="center">
      <img src="docs/screenshots/create-job.png" alt="Create Job" width="100%"><br>
      <sub><b>Create Job</b></sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="docs/screenshots/manage-jobs.png" alt="Manage Jobs" width="100%"><br>
      <sub><b>Manage Jobs</b></sub>
    </td>
    <td width="50%" align="center">
      <img src="docs/screenshots/manage-proposals.png" alt="Manage Proposals" width="100%"><br>
      <sub><b>Manage Proposals</b></sub>
    </td>
  </tr>
</table>

### 🚀 Freelancer Hub

Discover opportunities and submit winning proposals in seconds.

<table>
  <tr>
    <td width="50%" align="center">
      <img src="docs/screenshots/freelancer-dashboard.png" alt="Freelancer Dashboard" width="100%"><br>
      <sub><b>Freelancer Dashboard</b></sub>
    </td>
    <td width="50%" align="center">
      <img src="docs/screenshots/add-proposal.png" alt="Submit Proposal" width="100%"><br>
      <sub><b>Submit Proposal</b></sub>
    </td>
  </tr>
</table>

---

## 💎 Key Innovations

### 🤖 Context-Aware AI Ecosystem

Unlike standard chatbots, HireFlow integrates a **Role-Based AI Assistant** that dynamically queries the platform's database to provide hyper-relevant assistance:

- **Admin AI**: Full platform visibility (audits, reports, user management).
- **Client AI**: Focuses on job listings, incoming proposals, and talent filtering.
- **Freelancer AI**: Assists with job searches and proposal optimization.

### 📝 AI Bio Generation & Summarization

- **Profile Architect**: Generates professional, high-impact bios based on user achievements and skills.
- **Talent Highlights**: Automatically extracts "punchy" bullet points from long freelancer bios to help clients scan talent 5x faster.

### ⚡ Real-Time Infrastructure (WebSockets)

The platform features a persistent bi-directional communication layer:

- **Individual Streams**: Each user (Admin, Client, Freelancer) has a dedicated WebSocket connection managed by a `ConnectionManager`.
- **Instant Dispatch**: When a proposal is accepted or a job is reported, the backend instantly pushes JSON payloads to the specific user's dashboard.
- **Auto-Reconnection**: The system handles dead connections gracefully, ensuring the notification panel is always in sync.

### 🔗 Automation Logic (n8n Integration)

HireFlow offloads intensive or asynchronous tasks to an **n8n** instance, keeping the main API fast and lean:

- **Email Verification Flow**: Handles secure JWT-based email confirmation for new freelancer registrations.
- **Intelligent Alerting**: High-frequency job reports trigger an n8n webhook which can escalate alerts to Discord, Slack, or Email based on severity.
- **Workflow-as-Code**: All automation logic is version-controlled as JSON exports within the project.

---

## 🏗️ Architecture & Logic

### System Overview

```mermaid
graph TD
    User((User)) -->|Angular| Frontend[Frontend - Angular 21]
    Frontend -->|REST API / WebSockets| Backend[Backend - FastAPI]
    Backend -->|SQLAlchemy| DB[(MySQL Database)]
    Backend -->|OpenRouter API| AI[AI Core - GPT-4o mini]
    Backend -->|Webhooks| n8n[Automation - n8n]
    n8n -->|SMTP| Email[Email System]
```

### Backend Logic

The backend follows a **Service-Layer Pattern**, separating concerns into:

- **Routers**: Clean entry points for HTTP and WebSocket requests.
- **Services**: Heavy lifting (AI prompt engineering, database transactions, notification triggers).
- **Models**: Structured SQLAlchemy definitions for Users, Jobs, Proposals, Reports, and Notifications.

### Frontend Aesthetics

The frontend is built with a **Premium Design Language**:

- **Glassmorphism**: Subtle blurs, frosted glass effects, and depth-focused UI.
- **Micro-Animations**: Smooth transitions using modern CSS and Angular animations.
- **Vanilla CSS Tokens**: A custom-built design system using CSS variables for maximum performance and flexibility.

---

## 🛠️ Technology Stack

| Component          | Technology                  | Purpose                                |
| :----------------- | :-------------------------- | :------------------------------------- |
| **Frontend**       | Angular 21, TypeScript      | Reactive UI, SPA Architecture          |
| **Backend**        | Python 3.x, FastAPI         | High-performance Async API             |
| **Database**       | MySQL                       | Relational data persistence            |
| **ORM**            | SQLAlchemy                  | Pythonic database interaction          |
| **AI Integration** | OpenRouter (GPT-4o mini)    | Bio generation, Summarization, Chatbot |
| **Automation**     | n8n                         | Emailing, verification flows, alerts   |
| **Real-time**      | WebSockets                  | Instant notification delivery          |
| **Styling**        | Vanilla CSS (Custom Tokens) | Premium Glassmorphic design            |

---

## 📂 Project Structure

```bash
Hireflow-project/
├── backend/                # FastAPI Application
│   ├── app/
│   │   ├── core/           # Security, WebSockets, Config
│   │   ├── models/         # Database Schema
│   │   ├── routers/        # API Endpoints
│   │   ├── services/       # Business Logic (AI, Jobs, etc.)
│   │   └── schemas/        # Pydantic Data Validation
│   └── seed_v2.py          # Database seeding script
├── frontend-clean/         # Angular Application
│   ├── src/app/
│   │   ├── pages/          # Feature components (Dashboard, Home)
│   │   ├── core/           # Interceptors, Guards
│   │   └── services/       # API Integration
├── n8n_setup_guide.md      # Documentation for automation
└── hireflow emailing system.json # n8n Workflow export
```

---

## 🚦 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL Server
- OpenRouter API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Saadani124/Hireflow-platform.git
   ```
2. **Setup Backend:**
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   # Configure .env with DATABASE_URL and OPENROUTER_API_KEY
   python seed_v2.py
   uvicorn app.main:app --reload
   ```
3. **Setup Frontend:**
   ```bash
   cd frontend-clean
   npm install
   ng serve
   ```

---

## 📡 WebSockets Integration

- Uses FastAPI WebSockets for real-time updates.
- Eliminates the need for client-side polling.
- ConnectionManager tracks active users and their WebSocket connections.
- Allows targeted updates to specific users.
  Examples:
  - Proposal status updates
  - Report notifications
  - Updates are delivered instantly to the Angular frontend.

## ⚙️ n8n Automation Engine

n8n is used as a specialized orchestration layer.
Handles long-running and external processes outside the FastAPI app.
Manages tasks such as:

- Multi-channel notifications
- Email verification via external APIs
- Complex report scheduling
  Keeps FastAPI focused on:
- Fast, low-latency request handling
- Application state management
  Result: Better separation of responsibilities and reduced workload on FastAPI.

---

## 📜 License

This project is licensed under the MIT License. Developed with ❤️ by Saadani Talel & Karnit Aziz.
