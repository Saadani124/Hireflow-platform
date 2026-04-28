# Hireflow Platform

A modern freelancer marketplace platform built with **FastAPI** (Backend) and **Angular** (Frontend). Hireflow allows clients to post jobs, freelancers to submit proposals, and admins to oversee the reporting system.

## 🚀 Features
- **Role-based Dashboards:** Dedicated interfaces for Admin, Client, and Freelancer.
- **Reporting System:** Report jobs or proposals with automated notifications for admins and n8n webhook alerts for high-frequency reports.
- **Job Management:** Post, edit, and delete jobs with status tracking (Open, In Progress, Completed).
- **Proposal System:** Submit proposals with custom messages and prices. Support for re-applying if rejected.
- **Notification System:** Real-time in-app notifications for important actions.

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
