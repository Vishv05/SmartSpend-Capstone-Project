import React, { useState, useEffect } from "react";
import { fetchBudgetStatus } from "../api/expenses";

const BudgetWidget = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const data = await fetchBudgetStatus();
      setBudgets(data);
    } catch (err) {
      setError("Failed to load budgets");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (alertStatus) => {
    switch (alertStatus) {
      case 'ok':
        return '#10b981'; // green
      case 'alert':
        return '#f59e0b'; // amber
      default:
        return '#ef4444'; // red
    }
  };

  const getProgressBarColor = (percentage) => {
    if (percentage < 60) return '#10b981';
    if (percentage < 80) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card__header">
          <h3>💰 Budget Overview</h3>
        </div>
        <div className="card__body">
          <p>Loading budgets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card__header">
          <h3>💰 Budget Overview</h3>
        </div>
        <div className="card__body">
          <div className="alert alert--error">{error}</div>
        </div>
      </div>
    );
  }

  if (!budgets || budgets.length === 0) {
    return (
      <div className="card">
        <div className="card__header">
          <h3>💰 Budget Overview</h3>
        </div>
        <div className="card__body">
          <p className="text-muted">No active budgets configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <h3>💰 Budget Overview</h3>
        <span className="badge">{budgets.length} Active</span>
      </div>
      <div className="card__body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {budgets.map((budget) => (
            (() => {
              const usagePercentage = Number(budget.percentage || 0);
              return (
            <div
              key={budget.id}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {budget.department} - {budget.category}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} Budget
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: getStatusColor(budget.alert_status),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: budget.alert_status === 'ok' ? '#d1fae5' : (budget.alert_status === 'alert' ? '#fef3c7' : '#fee2e2')
                  }}
                >
                  {usagePercentage.toFixed(1)}%
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                <div
                  style={{
                    width: `${Math.min(usagePercentage, 100)}%`,
                    height: '100%',
                    backgroundColor: getProgressBarColor(usagePercentage),
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>

              {/* Budget details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
                <div>
                  <span>Spent: </span>
                  <span style={{ fontWeight: '600', color: '#111827' }}>₹{parseFloat(budget.spent).toLocaleString()}</span>
                </div>
                <div>
                  <span>Budget: </span>
                  <span style={{ fontWeight: '600', color: '#111827' }}>₹{parseFloat(budget.budget_amount).toLocaleString()}</span>
                </div>
                <div>
                  <span>Remaining: </span>
                  <span style={{ fontWeight: '600', color: parseFloat(budget.remaining) >= 0 ? '#10b981' : '#ef4444' }}>
                    ₹{parseFloat(budget.remaining).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
              );
            })()
          ))}
        </div>
      </div>
    </div>
  );
};

export default BudgetWidget;
