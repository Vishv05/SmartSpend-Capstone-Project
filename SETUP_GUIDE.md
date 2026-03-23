# SmartSpend - Complete Setup & Run Guide

## Project Structure
```
SmartSpend/
├── frontend/              # React UI
│   ├── src/
│   │   ├── pages/        # 5 main screens
│   │   ├── components/   # Reusable components
│   │   ├── api/          # API client
│   │   └── styles/       # Global styles
│   ├── package.json
│   └── .env
├── backend/              # Django REST API
│   ├── api/              # Main app
│   │   ├── models.py     # Database models
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── auth_views.py # Auth endpoints
│   │   └── urls.py
│   ├── smartspend/       # Project config
│   ├── manage.py
│   ├── requirements.txt
│   └── .env
└── docs/                 # Documentation
```

## Backend Setup (Django)

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Create Database & Initialize
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py init_db  # Creates default data & demo users
```

### 3. Create Superuser (Admin)
The `init_db` command already creates:
- Admin: admin@smartspend.com / admin123
- Manager: manager@smartspend.com / manager123
- Employee: employee@smartspend.com / employee123

To create additional superuser:
```bash
python manage.py createsuperuser
```

### 4. Run Development Server
```bash
python manage.py runserver
# Server runs on http://localhost:8000
```

### Optional: MongoDB Connection
This project uses SQLite as the primary database, but you can also connect a MongoDB instance for secondary storage or future features.

Add to backend/.env (or system environment):
```bash
MONGO_URI=mongodb://localhost:27017
MONGO_DB=smartspend
```

Health check endpoint (requires auth):
```
GET /api/mongo/health/
```

Access admin panel: http://localhost:8000/admin
API docs: http://localhost:8000/swagger/

## Frontend Setup (React)

### Prerequisite: Node.js Version
Use Node.js 18 or 20 for this project. Newer versions (ex: Node 24) can break `react-scripts`.

### 1. Install Dependencies
```bash
cd frontend
npm install
```

If you previously installed with a different Node version, do a clean reinstall:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 2. Run Development Server
```bash
npm start
# App runs on http://localhost:3000
```

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartspend.com | admin123 |
| Manager | manager@smartspend.com | manager123 |
| Employee | employee@smartspend.com | employee123 |

## API Endpoints

### Authentication
- POST /api/auth/register/ - Register new user
- POST /api/auth/login/ - Login (returns JWT tokens)
- GET /api/auth/profile/ - Get current user profile
- POST /api/auth/token/refresh/ - Refresh access token

### Expenses
- GET /api/expenses/ - List expenses
- POST /api/expenses/ - Create expense
- GET /api/expenses/{id}/ - Get expense detail
- PATCH /api/expenses/{id}/ - Update expense
- POST /api/expenses/{id}/approve/ - Approve/reject expense
- GET /api/expenses/analytics/ - Get dashboard KPIs

### Categories
- GET /api/categories/ - List categories
- POST /api/categories/ - Create category

### Users
- GET /api/users/ - List users
- GET /api/users/{id}/ - Get user detail
- PATCH /api/users/{id}/ - Update user

## Features Implemented (Phase 1)

✅ User registration and login with JWT
✅ 5 main screens (Login, Register, Dashboard, Add Expense, History)
✅ Expense CRUD operations
✅ Receipt upload (file handling)
✅ Category management
✅ Analytics dashboard
✅ Role-based access (Employee/Manager/Admin)
✅ Database with normalized schema
✅ API documentation (Swagger/OpenAPI)

## Future Enhancements (Phase 2)

🔲 OCR receipt extraction
🔲 Automated expense categorization
🔲 Anomaly detection (ML)
🔲 Advanced analytics & reports
🔲 Email notifications
🔲 Mobile app

## Troubleshooting

### Port Already in Use
Backend (Django):
```bash
python manage.py runserver 8001  # Use different port
```

Frontend (React):
```bash
PORT=3001 npm start
```

### Database Issues
Reset database:
```bash
rm db.sqlite3
python manage.py makemigrations
python manage.py migrate
python manage.py init_db
```

### Module Not Found
Ensure virtual environment is activated and dependencies installed:
```bash
pip install -r requirements.txt
```

### Frontend Fails to Start (react-scripts)
If you see errors from `react-scripts` or `react-refresh-webpack-plugin`, ensure Node.js 18 or 20 is in use, then do a clean reinstall:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

## Database Schema

Key tables:
- **users**: User profiles with roles (employee/manager/admin)
- **categories**: Expense categories
- **expenses**: Core expense records with status, amounts, dates
- **expense_comments**: Communication on expenses
- **audit_logs**: Activity trail
- **expense_policies**: Policy rules (future)

Indexes optimize category-wise, date-wise, and user-wise aggregations.

## Production Deployment

1. Update `DEBUG=False` in .env
2. Set a strong `SECRET_KEY`
3. Configure MySQL instead of SQLite
4. Use environment-based settings
5. Deploy with gunicorn/uWSGI
6. Set up nginx reverse proxy
7. Enable HTTPS/SSL
8. Configure email for notifications

