# SmartSpend Database Schema (Analytics-Ready)

## Core Entities

### 1. Users
- id (PK)
- username
- email
- first_name
- last_name
- role (employee/manager/admin)
- department
- employee_id
- manager_id (FK -> Users)
- created_at
- updated_at

### 2. Categories
- id (PK)
- name
- description
- icon
- monthly_limit
- is_active
- created_at

### 3. Expenses
- id (PK)
- user_id (FK -> Users)
- category_id (FK -> Categories)
- amount
- currency
- expense_date
- merchant
- description
- payment_method
- receipt_file
- receipt_ocr_data (JSON)
- status (pending/approved/rejected)
- approved_by (FK -> Users)
- approved_at
- rejection_reason
- submitted_at
- updated_at
- is_duplicate (boolean)
- is_anomaly (boolean)

### 4. Expense_Comments
- id (PK)
- expense_id (FK -> Expenses)
- user_id (FK -> Users)
- comment
- created_at

### 5. Expense_Policies
- id (PK)
- name
- description
- category_id (FK -> Categories)
- rules (JSON)
- is_active
- created_at

### 6. Audit_Logs
- id (PK)
- user_id (FK -> Users)
- expense_id (FK -> Expenses)
- action
- details (JSON)
- ip_address
- timestamp

## Analytics-Ready Indexing
- users(role, department)
- expenses(user_id, status)
- expenses(category_id, expense_date)
- expenses(status, submitted_at)
- expenses(expense_date)
- expenses(amount DESC)

## Data Validation Rules
- Amount > 0
- Expense date <= today
- Receipt required for amounts > configured threshold
- Category must exist and be active

## Future Analytics Support
- Category-wise aggregation
- Department-wise reporting
- Anomaly detection flags
- Policy violation analysis
- Time-series trend analysis

## Analytics Rationale
The schema is normalized and indexed to enable fast trend analysis, category aggregation, and department-wise reporting as data volumes grow.
