# Hireflow Platform

A modern freelancer marketplace platform built with **FastAPI** (Backend) and **Angular** (Frontend). Hireflow allows clients to post jobs, freelancers to submit proposals, and admins to oversee the reporting system.

## 🚀 Features
- **Real-Time WebSockets:** Instant notification delivery across all dashboards using a persistent bi-directional communication layer.
- **Service Layer Architecture:** Organized backend logic with dedicated services for Notifications, Reports, Jobs, and Proposals.
- **Advanced Reporting System:** Report jobs or proposals with automated notifications for admins and n8n webhook alerts for high-frequency reports.
- **Paginated Interfaces:** Efficient server-side pagination for jobs, proposals, and notifications to handle large datasets.
- **Secure Verification:** JWT-based email verification system for freelancers integrated with n8n.
- **Role-based Dashboards:** Dedicated premium interfaces for Admin, Client, and Freelancer.

## 🏗️ Project Structure
- `/backend`: FastAPI application with SQLAlchemy and MySQL.
- `/frontend-clean`: Angular application with a modern, glassmorphic design system.
- `/explication`: Database schema and API documentation.

## 🛠️ Tech Stack
- **Backend:** Python, FastAPI, SQLAlchemy, MySQL, Pydantic v2.
- **Frontend:** Angular, Vanilla CSS, Google Fonts.
- **Automation:** n8n for webhook-based alerting.

## 🚦 Getting Started
1. **Backend:** Follow instructions in `backend/README.md`.
2. **Frontend:** Follow instructions in `frontend-clean/README.md`.

## 📜 License
MIT License
