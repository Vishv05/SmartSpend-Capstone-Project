# SmartSpend AI Features Implementation

## Overview

SmartSpend now includes a comprehensive suite of professional-grade AI features designed to make expense management intelligent, predictive, and actionable. All features include explainability, user feedback loops, and drift monitoring for continuous improvement.

---

## ✨ Core AI Features Implemented

### 1. **Anomaly Detection + Explainability**
- **What it does**: Automatically detects unusual expense amounts by category using statistical z-score analysis.
- **How to access**: AI Insights → "Anomaly detection + explainability"
- **Key metrics**: Z-score, confidence score, expected range, category baseline
- **Explainability**: Shows contributing features (mean, std dev, z-score) for each anomaly
- **Feedback**: Users rate anomalies as "Useful" or "Not useful" for model improvement

### 2. **Smart Recurring Detection**
- **What it does**: Identifies subscription-like payments (same merchant, similar amount, regular intervals).
- **How to access**: AI Insights → "Smart recurring detection"
- **Confidence threshold**: Minimum 3 matching transactions with 20–40 day intervals
- **Next expected date**: Predicts when the next recurring payment should occur
- **Action**: Review if subscription is still needed or eligible for cancellation

### 3. **Monthly Spend Forecast**
- **What it does**: Projects end-of-month spending using a 90-day rolling average per category.
- **How to access**: AI Insights → Top stat card "Projected month-end spend"
- **Risk levels**: Normal or High (when projection > 125% of current month-to-date)
- **Category breakdown**: Shows projected allocation across top 6 categories
- **Requires confirmation**: User must acknowledge projection before acting on it

### 4. **Spend Health Score**
- **What it does**: Generates a 0–100 score reflecting spend balance, concentration, and anomaly frequency.
- **How to access**: AI Insights → Top stat card "Spend health score"
- **Score bands**:
  - **80+**: Excellent (well-balanced, predictable)
  - **65–79**: Good (acceptable concentration)
  - **45–64**: Watch (review category concentration)
  - **<45**: At Risk (high anomaly rate or concentration)
- **Explainability**: Breaks down impact of category concentration and anomaly frequency

### 5. **AI Coach (Weekly Actions)**
- **What it does**: Generates 3 prioritized actions based on anomalies, forecast, and health score.
- **How to access**: AI Insights → "AI coach (weekly actions)"
- **Examples**:
  - "Review top anomaly in [Category]"
  - "Projected overspend risk—adjust spending"
  - "Improve spend health score by shifting discretionary spend"
  - "Maintain current discipline"

### 6. **What-If Simulator**
- **What it does**: Models savings impact if you reduce spending in a specific category.
- **How to access**: AI Insights → "What-if simulator"
- **Inputs**: Category, reduction %, optional goal amount
- **Output**: Monthly savings, annual savings, months to reach goal
- **Use case**: "If I cut dining by 20%, how soon do I hit ₹50k savings goal?"

### 7. **Conversational Natural Language Insights**
- **What it does**: Answer plain-English questions about your spending patterns.
- **How to access**: AI Insights → "Conversational insights"
- **Sample questions**:
  - "Where did my money leak last month?"
  - "What's my forecast for this month?"
  - "What subscriptions am I paying for?"
- **Output**: Text answer + relevant insight cards (anomalies, recurring, forecast)

### 8. **Goal Intelligence**
- **What it does**: Track savings goals and estimate success probability with recommended weekly caps.
- **How to access**: AI Insights → "Goal intelligence"
- **Create a goal**: Name + target amount + optional monthly/weekly target
- **Projections**:
  - Success probability (based on current spend vs monthly target)
  - Months to reach goal
  - Recommended weekly spending cap to stay on track
- **Uses**: Validates goal feasibility; suggests adjustments using current burn rate

### 9. **AI Feedback Loop + Drift Monitoring** (Admin Only)
- **What it does**: Collects user feedback on insight accuracy; detects when model quality degrades.
- **How to access**: Users rate anomalies/insights as "Useful" or "Not useful"; admins view drift metrics
- **Admin panel**: AI Insights → "Model drift monitoring"
- **Metrics**:
  - Feedback count
  - Helpful ratio (% of insights rated as useful)
  - Drift status: `warming_up` | `stable` | `drift_detected`
  - Threshold: If helpful ratio < 55% and unhelpful count ≥ 4, drift is detected
- **Action**: Alert admins to retrain categorization rules or recalibrate thresholds

### 10. **Admin AI Summary** (Admin Only)
- **What it does**: High-level spend distribution and risk snapshot across all users.
- **How to access**: AI Insights → "Admin AI summary" (managers/admins only)
- **Insights**:
  - Top spend categories company-wide
  - Top spenders by amount
  - Risk users (those with highest anomaly counts)

---

## 🔧 Backend Architecture

### New Models
- **`FinancialGoal`**: User savings goals with target amount, monthly target, and target date
- **`InsightFeedback`**: Feedback on individual insights (useful/not useful, corrections, comments) for drift monitoring

### New Service Module: `api/insights.py`
Reusable insight computation functions:
- `compute_anomalies()` — z-score based anomaly detection
- `detect_recurring_transactions()` — recurring payment pattern detection
- `compute_forecast()` — month-end projection using rolling average
- `compute_health_score()` — spend balance score with drivers
- `generate_coaching_actions()` — priority-ranked action suggestions
- `run_what_if_simulation()` — savings impact calculator
- `answer_natural_language_question()` — conversational query handler
- `project_goals()` — goal success estimation
- `build_admin_summary()` — company-wide risk snapshot
- `build_drift_metrics()` — model quality monitoring

### New API Endpoints
All endpoints under `/api/expenses/` namespace:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `ai_anomalies/` | GET | User | List anomalies with explainability |
| `ai_recurring/` | GET | User | List detected recurring payments |
| `ai_forecast/` | GET | User | Project month-end spend |
| `ai_health_score/` | GET | User | Compute spend health score |
| `ai_coach/` | GET | User | Weekly coaching actions |
| `ai_what_if/` | POST | User | Simulate category reduction impact |
| `ai_query/` | POST | User | Answer natural language questions |
| `ai_goals/` | GET, POST | User | List/create savings goals |
| `ai_goal_update/` | PATCH | User | Update goal parameters |
| `ai_feedback/` | POST | User | Submit feedback on insights |
| `ai_drift/` | GET | Admin | Model quality metrics |
| `ai_admin_summary/` | GET | Admin | Company-wide spend snapshot |

---

## 🎨 Frontend

### New Page: **AI Insights** (`/ai-insights`)
Responsive layout with:
- **Top KPI cards**: Health score, month-end forecast, recurring count
- **Anomaly panel**: 5 most recent anomalies with z-scores, expected ranges, feedback buttons
- **Coach panel**: Current week's 3 prioritized actions
- **Recurring panel**: Detected subscriptions with confidence and ETA
- **What-if simulator**: Category picker, reduction %, goal amount input; shows monthly/annual savings
- **Goal tracker**: Add new goals (name, target, monthly target); view projections with success %
- **Conversational Q&A**: Ask questions; get text answer + insight cards
- **Admin panels**: (If user is manager/admin) Top categories, top users, drift status & helpful ratio

### Navigation
- Added "AI Insights" link in sidebar (visible to all users)
- Admin-only sections are hidden for regular employees

---

## 🚀 How to Use Each Feature

### **1. Review Today's Anomalies**
1. Navigate to **AI Insights**
2. Scroll to "Anomaly detection + explainability"
3. Review top anomalies by score
4. Click "Useful" or "Not useful" to provide feedback
5. Explained by: category mean, std dev, z-score

### **2. Track Subscriptions**
1. Go to **AI Insights** → "Smart recurring detection"
2. Spot recurring payments (e.g., Netflix, AWS, Office 365)
3. Review next expected date
4. Decide: Keep, cancel, or negotiate better terms

### **3. Plan Month-End Spending**
1. Check top KPI: "Projected month-end spend"
2. If risk level = "High", use **AI Coach** for suggested actions
3. Run **What-If Simulator** to see impact of category cuts
4. Adjust forecast by reviewing anomalies

### **4. Create a Savings Goal**
1. Go to **AI Insights** → "Goal intelligence"
2. Click form: Enter goal name (e.g., "Vacation Fund"), target amount, monthly target
3. View success probability and recommended weekly cap
4. Review progress weekly; adjust goal or spending as needed

### **5. Ask a Free-Form Spending Question**
1. Go to **AI Insights** → "Conversational insights"
2. Type question: "Where did my money leak last month?"
3. AI returns text answer + related insight cards (anomalies, recurring, forecast)

### **6. Analyze Category Reduction Impact** (What-If)
1. Go to **AI Insights** → "What-if simulator"
2. Select category (e.g., "Meals"), reduction % (e.g., 20)
3. Optionally set goal amount (e.g., ₹50,000)
4. View monthly/annual savings + months to goal

### **7. Monitor Model Accuracy** (Admins)
1. Go to **AI Insights** → "Model drift monitoring"
2. Track helpful ratio & drift status
3. If drift_detected, review user feedback corrections and retrain category rules
4. Note: Drift activates after 10+ feedback points and < 55% helpful ratio

---

## 📊 Data Privacy & Safety

- ✅ All AI features process user's own expenses only (unless admin role)
- ✅ No external API calls—all computation is on-device/on-server
- ✅ Feedback and goals are stored in local database; not shared
- ✅ Admin features require staff/admin role and are logged in audit trail
- ✅ User can delete any goal or feedback entry at any time (future enhancement)

---

## 🔄 Feedback Loop & Continuous Improvement

**User Feedback**:
1. Rate anomaly as "Useful" or "Not useful" → stored in `InsightFeedback`
2. Provide optional comment on why feedback was given
3. Admin can review feedback trends to identify model drift

**Drift Detection**:
- Calculated as: `helpful_count / total_feedback`
- Threshold: If ratio < 55% or bad feedback ≥ 4, "drift_detected" status activates
- Action: Retrain anomaly z-score thresholds or review category definitions

---

## 🎯 Next Steps (Future Enhancements)

1. **OCR Receipt Parsing**: Auto-extract amounts from receipt images
2. **Personalized Recommendation Engine**: Suggest category reduction targets based on industry/role
3. **Multi-User Benchmarking**: Compare your spend to peer groups
4. **Smart Recurring Categorization**: Auto-categorize new recurring expenses
5. **Forecast Confidence Intervals**: Show 80% & 95% prediction bands
6. **Goal Adjustments**: Recommend weekly spending caps dynamically as goals near
7. **Approval Speed Analytics**: Show forecast error & improvement over time
8. **Scheduled Coaching Digest**: Email weekly actions every Sunday
9. **Mobile App**: Native iOS/Android app with push notifications for high anomalies
10. **Integration with Banks**: Direct card sync for real-time expense capture

---

## 📚 API Examples

### Get Anomalies
```bash
curl -X GET "http://localhost:8000/api/expenses/ai_anomalies/" \
  -H "Authorization: Bearer <your_token>"
```

Response:
```json
{
  "count": 3,
  "items": [
    {
      "expense_id": 42,
      "merchant": "Aurora Travel",
      "category": "Travel",
      "amount": 2430.00,
      "z_score": 3.2,
      "score": 85,
      "confidence": 0.92,
      "reason": "Amount is unusually higher than your Travel baseline.",
      "expected_range": {
        "min": 500.00,
        "max": 1800.00
      },
      "explainability": {
        "contributors": [
          { "feature": "category_mean", "value": 1200.00 },
          { "feature": "category_std_dev", "value": 410.00 },
          { "feature": "z_score", "value": 3.2 }
        ]
      }
    }
  ]
}
```

### Create a Goal
```bash
curl -X POST "http://localhost:8000/api/expenses/ai_goals/" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Vacation Fund",
    "target_amount": 50000,
    "monthly_target": 5000
  }'
```

### Run What-If Simulation
```bash
curl -X POST "http://localhost:8000/api/expenses/ai_what_if/" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Meals",
    "reduction_percent": 20,
    "goal_amount": 50000
  }'
```

Response:
```json
{
  "category": "Meals",
  "reduction_percent": 20,
  "monthly_savings_estimate": 1200.00,
  "annual_savings_estimate": 14400.00,
  "months_to_goal": 41.7
}
```

---

## 🛠️ Technical Stack

| Component | Technology |
|-----------|------------|
| **Backend insights engine** | Python (statistics, datetime, collections modules) |
| **Frontend page** | React 18, Chart.js for visualization |
| **Database** | SQLite/PostgreSQL (FinancialGoal, InsightFeedback models) |
| **API style** | RESTful endpoints on DRF with JSON responses |
| **Authentication** | JWT-based (from existing auth_views.py) |

---

## 📝 Summary

SmartSpend's AI suite transforms expense management from reactive (reviewing past) to **proactive** (predicting & optimizing future). Every insight is:

✅ **Explainable**: Users see *why* the AI made a recommendation  
✅ **Actionable**: Features suggest concrete next steps (reduce [category], create goal, verify subscription)  
✅ **Safe**: User feedback loops and drift monitoring ensure quality  
✅ **Private**: All computation is on-server; no external AI APIs  
✅ **Role-based**: Admin insights for company-wide oversight  

Start with **anomalies & recurring detection** for quick wins, then layer in **goals & forecasting** for deeper control.

---

**Created**: March 7, 2026  
**Status**: Production-ready  
**Maintenance**: Daily drift monitoring + quarterly threshold reviews
