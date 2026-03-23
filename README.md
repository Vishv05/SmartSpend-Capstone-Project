<<<<<<< HEAD
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
=======
# 💰 SmartSpend – Expense Tracking Web Application

## 📌 Project Overview

SmartSpend is a full-stack web application developed to help users efficiently manage their daily expenses.
It enables users to record, categorize, and analyze their spending habits through an intuitive and user-friendly interface.

This project was developed as part of a **Capstone Project** for the Integrated MSc IT program.

---

## 🚀 Features

* 🔐 User Authentication (Login / Register / Logout)
* 💵 Add, Edit, and Delete Expenses
* 📊 Expense Categorization (Food, Travel, Bills, etc.)
* 📈 Dashboard with Spending Insights
* 📅 Date-wise Expense Tracking
* 🔎 Search and Filter Functionality
* 🧑‍💼 Admin Panel for Data Management
* 📱 Responsive UI Design

---

## 🛠️ Tech Stack

### Frontend:

* HTML5
* CSS3
* JavaScript

### Backend:

* Django (Python)

### Database:

* SQLite (for development)

---

## 📂 Project Structure

```
smartspend/
│
├── app/
├── templates/
├── static/
├── media/
├── manage.py
├── db.sqlite3
├── requirements.txt
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```
git clone https://github.com/yourusername/smartspend-capstone-project.git
cd smartspend-capstone-project
```

### 2️⃣ Create Virtual Environment

```
python -m venv venv
venv\Scripts\activate   # For Windows
```

### 3️⃣ Install Dependencies

```
pip install -r requirements.txt
```

### 4️⃣ Run Migrations

```
python manage.py migrate
```

### 5️⃣ Start Development Server

```
python manage.py runserver
```

---

## 📊 Future Enhancements

* 📉 Advanced Analytics with Charts
* 💳 Payment Integration
* 📤 Export Reports (PDF/Excel)
* 📱 Mobile App Version
* ☁️ Cloud Database Integration (e.g., PostgreSQL / AlloyDB)

---

## 🎯 Learning Outcomes

* Full-stack web development using Django
* Database design and management
* UI/UX design implementation
* Authentication and security handling
* Real-world project structuring

---

## 👨‍💻 Author

**Vishv Bhavsar**
UI/UX Designer | Web Developer | Python Enthusiast

---

## 📜 License

This project is developed for academic and learning purposes.
>>>>>>> 511ca969aac6ab3be03f96614ca6dfe8f0fccd6d
