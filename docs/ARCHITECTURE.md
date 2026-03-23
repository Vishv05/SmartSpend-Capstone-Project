# SmartSpend Architecture (Phase 1)

## 1. Modular Architecture
- **Frontend (React)**: UI/UX with reusable components
- **Backend (Django REST)**: API layer, authentication, business logic
- **Analytics Layer (Pandas/NumPy)**: Aggregation, trends, anomalies
- **Database (SQLite/MySQL)**: Normalized, analytics-ready schema

## 2. Data Flow (Expense Lifecycle)
1. Employee submits expense (UI → API)
2. Expense stored as structured record
3. Manager approves/rejects (status update)
4. Analytics engine aggregates for KPIs
5. Dashboard consumes analytics endpoints

## 3. Scalability & Maintainability
- Clear separation of concerns
- API-first approach
- Future ML modules isolated in analytics layer
- Indexed DB schema for fast queries

## 4. Data Analyst Perspective
- Expense data treated as structured dataset
- Validation at API and DB level
- Supports trend and category analysis
- Enables anomaly detection and policy compliance

## 5. Viva-Ready Notes
- Each module is explainable independently
- UI → API → DB → Analytics flow is linear
- Easy to extend with OCR & ML in Phase 2
