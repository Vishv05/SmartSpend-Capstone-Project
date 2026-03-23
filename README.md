# SmartSpend (Enterprise Expense Analytics)

## Project Overview
SmartSpend is an enterprise expense analytics platform designed for expense submission, approval workflows, and data-driven insights.

## Phase 1 Deliverables
- 5 connected frontend screens (Login, Register, Dashboard, Add Expense, Expense History)
- Full-stack REST API with Django
- Analytics-ready database schema
- Documentation for viva and academic review

## Tech Stack
- Frontend: React, HTML5, CSS3, JS
- Backend: Django REST Framework
- Database: SQLite
- Analytics: Pandas, NumPy

## Quick Start

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py init_db
python manage.py runserver
```
Backend runs on http://localhost:8000

### Frontend Setup
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```
Frontend runs on http://localhost:3000

### Test Credentials
- **Admin**: admin@smartspend.com / admin123
- **Manager**: manager@smartspend.com / manager123
- **Employee**: employee@smartspend.com / employee123

## Full Setup Guide
See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed installation and troubleshooting instructions.

## Directory Structure
- frontend/  React UI
- backend/   Django REST API
- docs/      Architecture & viva docs
