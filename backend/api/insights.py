from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from statistics import mean, pstdev


def _to_float(value):
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def to_expense_rows(expenses):
    rows = []
    for expense in expenses:
        rows.append(
            {
                "id": expense.id,
                "user_id": expense.user_id,
                "amount": _to_float(expense.amount),
                "expense_date": expense.expense_date,
                "merchant": (expense.merchant or "Unknown").strip(),
                "category": expense.category.name if expense.category else "Uncategorized",
                "status": expense.status,
            }
        )
    rows.sort(key=lambda item: item["expense_date"])
    return rows


def compute_anomalies(rows, lookback_days=365):
    if not rows:
        return []

    cutoff = rows[-1]["expense_date"] - timedelta(days=lookback_days)
    recent_rows = [row for row in rows if row["expense_date"] >= cutoff]
    if len(recent_rows) < 5:
        recent_rows = list(rows)
    anomalies = []

    for index, row in enumerate(recent_rows):
        category = row["category"]
        baseline = [
            item["amount"]
            for position, item in enumerate(recent_rows)
            if item["category"] == category and position != index
        ]
        if len(baseline) < 2:
            continue

        baseline_mean = mean(baseline)
        baseline_std = pstdev(baseline) or 1.0
        z_score = (row["amount"] - baseline_mean) / baseline_std

        delta = abs(row["amount"] - baseline_mean)
        z_rule = abs(z_score) >= 1.8 and delta >= max(300.0, baseline_mean * 0.35)
        high_spike_rule = row["amount"] >= (baseline_mean * 1.8) and (row["amount"] - baseline_mean) >= 200.0
        low_dip_rule = row["amount"] <= (baseline_mean * 0.45) and (baseline_mean - row["amount"]) >= 200.0

        if not (z_rule or high_spike_rule or low_dip_rule):
            continue

        direction = "higher" if z_score > 0 else "lower"
        confidence = min(0.99, 0.5 + (abs(z_score) / 10.0))
        score = min(100, int(abs(z_score) * 20 + 40))

        anomalies.append(
            {
                "expense_id": row["id"],
                "category": category,
                "merchant": row["merchant"],
                "amount": round(row["amount"], 2),
                "z_score": round(z_score, 2),
                "score": score,
                "confidence": round(confidence, 2),
                "is_anomaly": True,
                "reason": f"Amount is unusually {direction} than your {category} baseline.",
                "expected_range": {
                    "min": round(max(0, baseline_mean - (1.5 * baseline_std)), 2),
                    "max": round(baseline_mean + (1.5 * baseline_std), 2),
                },
                "explainability": {
                    "contributors": [
                        {"feature": "category_mean", "value": round(baseline_mean, 2)},
                        {"feature": "category_std_dev", "value": round(baseline_std, 2)},
                        {"feature": "z_score", "value": round(z_score, 2)},
                    ]
                },
            }
        )

    anomalies.sort(key=lambda item: item["score"], reverse=True)
    return anomalies[:10]


def compute_forecast(rows, reference_date=None):
    if reference_date is None:
        reference_date = date.today()

    month_start = reference_date.replace(day=1)
    month_rows = [row for row in rows if row["expense_date"] >= month_start]
    month_total = sum(row["amount"] for row in month_rows)

    ninety_day_start = reference_date - timedelta(days=90)
    rolling_rows = [row for row in rows if row["expense_date"] >= ninety_day_start]
    rolling_total = sum(row["amount"] for row in rolling_rows)

    days_elapsed = max(reference_date.day, 1)
    days_in_month = 28
    for candidate in [31, 30, 29, 28]:
        try:
            reference_date.replace(day=candidate)
            days_in_month = candidate
            break
        except ValueError:
            continue

    daily_average = (rolling_total / 90.0) if rolling_total > 0 else (month_total / days_elapsed)
    projected_month_end = daily_average * days_in_month

    category_totals = defaultdict(float)
    for row in rolling_rows:
        category_totals[row["category"]] += row["amount"]

    category_projection = []
    if rolling_total > 0:
        for category, total in sorted(category_totals.items(), key=lambda item: item[1], reverse=True):
            share = total / rolling_total
            category_projection.append(
                {
                    "category": category,
                    "projected_amount": round(projected_month_end * share, 2),
                    "share_percent": round(share * 100, 2),
                }
            )

    return {
        "period": {
            "month": reference_date.strftime("%Y-%m"),
            "days_elapsed": days_elapsed,
            "days_in_month": days_in_month,
        },
        "current_month_total": round(month_total, 2),
        "daily_average": round(daily_average, 2),
        "projected_month_end": round(projected_month_end, 2),
        "risk_level": "high" if projected_month_end > month_total * 1.25 and month_total > 0 else "normal",
        "category_projection": category_projection[:6],
        "requires_confirmation": True,
    }


def detect_recurring_transactions(rows):
    grouped = defaultdict(list)
    for row in rows:
        key = (row["merchant"].lower(), round(row["amount"], 0))
        grouped[key].append(row)

    recurring = []
    for (merchant, amount_bucket), group in grouped.items():
        if len(group) < 3:
            continue

        dates = [item["expense_date"] for item in group]
        dates.sort()
        intervals = [(dates[index] - dates[index - 1]).days for index in range(1, len(dates))]
        if not intervals:
            continue

        avg_interval = mean(intervals)
        if not (20 <= avg_interval <= 40):
            continue

        confidence = min(0.97, 0.6 + (len(group) * 0.07))
        next_due = dates[-1] + timedelta(days=round(avg_interval))
        recurring.append(
            {
                "merchant": merchant.title(),
                "amount": round(mean([item["amount"] for item in group]), 2),
                "occurrences": len(group),
                "average_interval_days": round(avg_interval, 1),
                "next_expected_date": next_due.isoformat(),
                "confidence": round(confidence, 2),
                "recommendation": "Review if this subscription is still needed.",
                "requires_confirmation": True,
            }
        )

    recurring.sort(key=lambda item: (item["occurrences"], item["confidence"]), reverse=True)
    return recurring[:8]


def compute_health_score(rows, anomalies):
    if not rows:
        return {
            "score": 0,
            "band": "insufficient_data",
            "drivers": [],
        }

    total_amount = sum(row["amount"] for row in rows)
    category_totals = defaultdict(float)
    for row in rows:
        category_totals[row["category"]] += row["amount"]

    concentration_penalty = 0
    if total_amount > 0:
        top_share = max(category_totals.values()) / total_amount
        concentration_penalty = max(0, int((top_share - 0.35) * 100))

    anomaly_penalty = min(25, len(anomalies) * 4)
    base_score = 100 - concentration_penalty - anomaly_penalty
    score = max(0, min(100, base_score))

    if score >= 80:
        band = "excellent"
    elif score >= 65:
        band = "good"
    elif score >= 45:
        band = "watch"
    else:
        band = "at_risk"

    drivers = [
        {
            "name": "category_concentration",
            "impact": -concentration_penalty,
            "detail": "Higher concentration in one category reduces resilience.",
        },
        {
            "name": "anomaly_frequency",
            "impact": -anomaly_penalty,
            "detail": "Frequent spend spikes reduce predictability.",
        },
        {
            "name": "coverage",
            "impact": 5 if len(rows) >= 12 else 0,
            "detail": "More spending history improves model reliability.",
        },
    ]

    explainability = {
        "contributors": [
            {"feature": "top_category_share_penalty", "value": concentration_penalty},
            {"feature": "anomaly_count_penalty", "value": anomaly_penalty},
            {"feature": "history_rows", "value": len(rows)},
        ]
    }

    return {
        "score": score,
        "band": band,
        "drivers": drivers,
        "explainability": explainability,
    }


def generate_coaching_actions(rows, forecast, anomalies, health_score):
    actions = []
    if anomalies:
        top_anomaly = anomalies[0]
        actions.append(
            {
                "title": "Review top anomaly",
                "message": f"{top_anomaly['merchant']} in {top_anomaly['category']} exceeded expected range.",
                "priority": "high",
                "requires_confirmation": True,
            }
        )

    if forecast["risk_level"] == "high":
        actions.append(
            {
                "title": "Projected overspend risk",
                "message": "Current projection is running significantly above the month-to-date run rate.",
                "priority": "high",
                "requires_confirmation": True,
            }
        )

    if health_score["score"] < 65:
        actions.append(
            {
                "title": "Improve spend health score",
                "message": "Shift discretionary spend from your top category for the next 2 weeks.",
                "priority": "medium",
                "requires_confirmation": True,
            }
        )

    if not actions:
        actions.append(
            {
                "title": "Maintain current discipline",
                "message": "Your patterns are stable. Keep your current approval and receipt workflow.",
                "priority": "low",
                "requires_confirmation": True,
            }
        )

    return {
        "week_of": date.today().isoformat(),
        "actions": actions[:3],
    }


def run_what_if_simulation(rows, category_name, reduction_percent, goal_amount=None):
    normalized_category = (category_name or "").strip().lower()
    if reduction_percent < 0:
        reduction_percent = 0
    if reduction_percent > 80:
        reduction_percent = 80

    ninety_day_cutoff = date.today() - timedelta(days=90)
    scoped_rows = [row for row in rows if row["expense_date"] >= ninety_day_cutoff]
    category_spend = sum(
        row["amount"] for row in scoped_rows if row["category"].lower() == normalized_category
    )

    monthly_category_estimate = category_spend / 3.0 if category_spend else 0.0
    monthly_savings = monthly_category_estimate * (reduction_percent / 100.0)
    annual_savings = monthly_savings * 12

    months_to_goal = None
    if goal_amount and monthly_savings > 0:
        months_to_goal = round(goal_amount / monthly_savings, 1)

    return {
        "category": category_name,
        "reduction_percent": round(reduction_percent, 2),
        "monthly_savings_estimate": round(monthly_savings, 2),
        "annual_savings_estimate": round(annual_savings, 2),
        "months_to_goal": months_to_goal,
        "requires_confirmation": True,
    }


def answer_natural_language_question(question, rows, forecast, anomalies, recurring):
    prompt = (question or "").strip().lower()

    category_totals = defaultdict(float)
    for row in rows:
        category_totals[row["category"]] += row["amount"]

    top_category = None
    if category_totals:
        category, total = sorted(category_totals.items(), key=lambda item: item[1], reverse=True)[0]
        top_category = {"category": category, "total": round(total, 2)}

    if "leak" in prompt or "where" in prompt:
        if top_category:
            return {
                "answer": f"Your largest spend concentration is {top_category['category']} at {top_category['total']:.2f}.",
                "insight_cards": [
                    {
                        "title": "Top spend leak",
                        "value": top_category,
                    }
                ],
            }

    if "forecast" in prompt or "month" in prompt:
        return {
            "answer": (
                f"Projected month-end spend is {forecast['projected_month_end']:.2f}, "
                f"with a {forecast['risk_level']} risk profile."
            ),
            "insight_cards": [
                {
                    "title": "Forecast",
                    "value": forecast,
                }
            ],
        }

    if "subscription" in prompt or "recurring" in prompt:
        return {
            "answer": f"Detected {len(recurring)} likely recurring payment(s).",
            "insight_cards": [
                {
                    "title": "Recurring candidates",
                    "value": recurring[:3],
                }
            ],
        }

    return {
        "answer": "Top opportunities: review anomalies, recurring payments, and current month forecast risk.",
        "insight_cards": [
            {"title": "Anomalies", "value": anomalies[:3]},
            {"title": "Recurring", "value": recurring[:3]},
            {"title": "Forecast", "value": forecast},
        ],
    }


def project_goals(rows, goals):
    ninety_day_cutoff = date.today() - timedelta(days=90)
    scoped_rows = [row for row in rows if row["expense_date"] >= ninety_day_cutoff]
    monthly_spend = sum(item["amount"] for item in scoped_rows) / 3.0 if scoped_rows else 0.0

    result = []
    for goal in goals:
        monthly_saving = _to_float(goal.monthly_target)
        target_amount = _to_float(goal.target_amount)
        if monthly_saving <= 0:
            probability = 0
            months_to_goal = None
        else:
            months_to_goal = round(target_amount / monthly_saving, 1)
            pressure = min(1.0, monthly_spend / max(monthly_saving, 1))
            probability = max(5, min(95, int((1.1 - pressure) * 100)))

        result.append(
            {
                "id": goal.id,
                "name": goal.name,
                "target_amount": target_amount,
                "monthly_target": monthly_saving,
                "target_date": goal.target_date.isoformat() if goal.target_date else None,
                "probability_percent": probability,
                "months_to_goal": months_to_goal,
                "recommended_weekly_cap": round(monthly_spend / 4.0, 2),
            }
        )

    return result


def build_admin_summary(rows, anomalies):
    user_totals = defaultdict(float)
    category_totals = defaultdict(float)
    for row in rows:
        user_totals[row["user_id"]] += row["amount"]
        category_totals[row["category"]] += row["amount"]

    top_users = [
        {"user_id": user_id, "total": round(total, 2)}
        for user_id, total in sorted(user_totals.items(), key=lambda item: item[1], reverse=True)[:5]
    ]
    top_categories = [
        {"category": category, "total": round(total, 2)}
        for category, total in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)[:5]
    ]

    risk_users = defaultdict(int)
    for anomaly in anomalies:
        expense_id = anomaly.get("expense_id")
        matched = next((row for row in rows if row["id"] == expense_id), None)
        if matched:
            risk_users[matched["user_id"]] += 1

    risk_snapshot = [
        {"user_id": user_id, "anomaly_count": count}
        for user_id, count in sorted(risk_users.items(), key=lambda item: item[1], reverse=True)[:5]
    ]

    return {
        "top_users": top_users,
        "top_categories": top_categories,
        "risk_users": risk_snapshot,
    }


def build_drift_metrics(feedback_rows):
    total = len(feedback_rows)
    if total == 0:
        return {
            "feedback_count": 0,
            "helpful_ratio": None,
            "drift_status": "insufficient_data",
            "message": "Collect at least 10 feedback points for drift monitoring.",
        }

    helpful = len([item for item in feedback_rows if item.is_useful is True])
    unhelpful = len([item for item in feedback_rows if item.is_useful is False])
    helpful_ratio = helpful / total

    if total < 10:
        status = "warming_up"
    elif helpful_ratio < 0.55 and unhelpful >= 4:
        status = "drift_detected"
    else:
        status = "stable"

    return {
        "feedback_count": total,
        "helpful_ratio": round(helpful_ratio, 2),
        "drift_status": status,
        "message": "Monitor correction and retrain categorization rules when drift is detected.",
    }