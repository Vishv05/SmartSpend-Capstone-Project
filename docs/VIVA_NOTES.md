# SmartSpend Viva Notes (Quick Explanation)

## What is SmartSpend?
- Enterprise expense analytics platform
- Employees submit expenses, managers review
- Analytics layer provides insights for decision-making

## Why Data-Driven?
- Expenses are structured datasets
- Clean data enables KPIs, trends, category analysis

## Data Analytics Perspective
Expense records are collected as clean, validated data at the time of submission.
They are processed by aggregating across category, user, and time dimensions.
This enables insights such as trends, anomalies, and policy compliance readiness.

## Key Screens (Phase 1)
- Login, Register
- Employee Dashboard (KPIs + status breakdown)
- Add Expense (receipt upload + OCR placeholder)
- Expense History (filters + analytics summary)

## Backend Plan
- Django REST API
- CRUD for expenses, users, categories
- Analytics endpoints for KPIs

## Database Design
- Normalized tables: users, expenses, categories
- Indexes for analytics performance
- Future ML support via anomaly flags

## Phase 2 Roadmap
- OCR extraction
- Auto-categorization
- Anomaly detection
- BI dashboards
