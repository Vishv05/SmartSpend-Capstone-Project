# SmartSpend API Specification (Phase 1)

## Authentication (Planned)
- JWT-based authentication
- Roles: Employee, Manager, Admin

## Phase Notes
- Phase 1: Core CRUD and analytics endpoints planned for implementation scope.
- Phase 2: OCR extraction and automated approval workflows (AI/Policy) planned.

## Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh

### Users
- GET /api/users
- GET /api/users/{id}
- PATCH /api/users/{id}

### Categories
- GET /api/categories
- POST /api/categories

### Expenses
- GET /api/expenses
- POST /api/expenses
- GET /api/expenses/{id}
- PATCH /api/expenses/{id}
- DELETE /api/expenses/{id}
- POST /api/expenses/{id}/approve

### Analytics
- GET /api/expenses/analytics

## Core Request/Response Examples

### Create Expense
**Request**
```json
{
  "category": 1,
  "amount": 4500.00,
  "expense_date": "2026-01-30",
  "merchant": "Uber",
  "description": "Airport transfer",
  "payment_method": "upi"
}
```

**Response**
```json
{
  "id": 101,
  "user": 45,
  "user_name": "Aarav Patel",
  "category": 1,
  "category_name": "Transportation",
  "amount": 4500.00,
  "currency": "INR",
  "expense_date": "2026-01-30",
  "merchant": "Uber",
  "description": "Airport transfer",
  "payment_method": "upi",
  "status": "pending",
  "submitted_at": "2026-01-31T09:22:14Z"
}
```

### Approve Expense
**Request**
```json
{
  "status": "approved"
}
```

**Response**
```json
{
  "id": 101,
  "status": "approved",
  "approved_by": 12,
  "approved_by_name": "Manager Smith",
  "approved_at": "2026-01-31T10:05:00Z"
}
```
