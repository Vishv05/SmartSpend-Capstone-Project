import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import PageHeader from "../components/PageHeader";
import { fetchAiSuggestions, fetchExpenses } from "../api/expenses";
import { formatCurrency } from "../utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const Forecast = () => {
  const [expenses, setExpenses] = useState([]);
  const [suggestionState, setSuggestionState] = useState({
    loading: true,
    error: "",
    data: null,
  });
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedSuggestions, setExpandedSuggestions] = useState(new Set());

  const toggleSuggestion = (index) => {
    setExpandedSuggestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const loadExpenses = async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    setSuggestionState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const [expenseData, suggestionData] = await Promise.all([
        fetchExpenses(),
        fetchAiSuggestions(),
      ]);
      setExpenses(expenseData);
      setSuggestionState({ loading: false, error: "", data: suggestionData });
      setStatus({ loading: false, error: "" });
      setLastUpdated(new Date());
    } catch (error) {
      setSuggestionState({ loading: false, error: "Unable to load AI suggestions.", data: null });
      setStatus({ loading: false, error: "Unable to load expenses." });
    }
  };

  useEffect(() => {
    loadExpenses();

    const handleUpdate = () => loadExpenses();
    window.addEventListener("focus", handleUpdate);
    window.addEventListener("smartspend:expenses-updated", handleUpdate);
    const intervalId = window.setInterval(handleUpdate, 60000);

    return () => {
      window.removeEventListener("focus", handleUpdate);
      window.removeEventListener("smartspend:expenses-updated", handleUpdate);
      window.clearInterval(intervalId);
    };
  }, []);

  const forecast = useMemo(() => {
    const now = new Date();
    const parsedExpenses = expenses
      .map((expense) => {
        const rawDate = expense.expense_date || expense.date;
        const parsed = rawDate ? new Date(rawDate) : null;
        const validDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
        const rawAmount = expense.amount;
        const amount = typeof rawAmount === "number"
          ? rawAmount
          : Number(String(rawAmount ?? "0").replace(/[^0-9.-]+/g, ""));
        return {
          date: validDate,
          amount: Number.isFinite(amount) ? amount : 0,
        };
      })
      .filter((row) => row.date);

    const dates = parsedExpenses.map((row) => row.date);
    const earliest = dates.length
      ? new Date(Math.min(...dates.map((date) => date.getTime())))
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const latest = dates.length
      ? new Date(Math.max(...dates.map((date) => date.getTime())))
      : now;

    const referenceDate = latest;

    const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const months = [];

    for (
      let cursor = new Date(start);
      cursor <= end;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    ) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      const label = cursor.toLocaleDateString("en-US", { month: "short" });
      months.push({ key, label, total: 0 });
    }

    parsedExpenses.forEach((expense) => {
      const parsed = expense.date;
      const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      const month = months.find((item) => item.key === key);
      if (month) {
        month.total += expense.amount;
      }
    });

    const daysInMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
      .getDate();
    const currentKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
    const currentMonth = months.find((item) => item.key === currentKey);
    const currentTotal = currentMonth ? currentMonth.total : 0;

    const windowStart = new Date(referenceDate);
    windowStart.setDate(windowStart.getDate() - 90);

    const rollingSpend = parsedExpenses.reduce((sum, expense) => {
      if (expense.date < windowStart) {
        return sum;
      }
      return sum + expense.amount;
    }, 0);

    const dailyAverage = rollingSpend > 0
      ? rollingSpend / 90
      : currentTotal / Math.max(1, referenceDate.getDate());
    const projection = dailyAverage * daysInMonth;

    const labels = months.map((m) => m.label);
    const actuals = months.map((m) => m.total);
    const projectionSeries = months.map((m) => (m.key === currentKey ? projection : null));

    return {
      labels,
      actuals,
      projectionSeries,
      months,
      currentTotal,
      projection,
      dailyAverage,
    };
  }, [expenses]);

  return (
    <div className="page">
      <PageHeader
        title="Spend forecast"
        subtitle="End-of-month projection based on the last 90 days of spend."
        actions={
          <button className="button button--ghost" type="button" onClick={loadExpenses}>
            Refresh data
          </button>
        }
      />
      {status.error ? <div className="alert">{status.error}</div> : null}
      {lastUpdated ? (
        <div className="stat-card__label">Last updated {lastUpdated.toLocaleTimeString()}</div>
      ) : null}
      <div className="grid grid--three">
        <div className="card stat-card">
          <div className="stat-card__label">Current month to date</div>
          <div className="stat-card__value">{formatCurrency(forecast.currentTotal)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Projected month end</div>
          <div className="stat-card__value">{formatCurrency(forecast.projection)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Avg daily spend</div>
          <div className="stat-card__value">{formatCurrency(forecast.dailyAverage)}</div>
        </div>
      </div>
      <div className="card">
        <h3>Monthly trend + projection</h3>
        <div className="chart" style={{ height: 320 }}>
          <Line
            data={{
              labels: forecast.labels,
              datasets: [
                {
                  label: "Actual",
                  data: forecast.actuals,
                  borderColor: "#184c60",
                  backgroundColor: "rgba(24, 76, 96, 0.15)",
                  pointRadius: 4,
                  tension: 0.3,
                },
                {
                  label: "Projection",
                  data: forecast.projectionSeries,
                  borderColor: "#db7c2d",
                  backgroundColor: "rgba(219, 124, 45, 0.2)",
                  pointRadius: 5,
                  borderDash: [6, 6],
                  tension: 0.3,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" } },
              scales: {
                x: { grid: { display: false } },
                y: { grid: { color: "rgba(0,0,0,0.05)" } },
              },
            }}
          />
        </div>
        <p className="stat-card__label">
          Projection uses a 90-day rolling average. Adjust the time window if you want a more
          conservative estimate.
        </p>
      </div>
      <div className="card">
        <h3>AI Spend Insights</h3>
        {suggestionState.loading ? (
          <p className="stat-card__label">Analyzing your spending patterns...</p>
        ) : suggestionState.error ? (
          <div className="alert">{suggestionState.error}</div>
        ) : !suggestionState.data?.eligible ? (
          <p className="stat-card__label">{suggestionState.data?.message}</p>
        ) : (
          <>
            {suggestionState.data?.tier === "early_insights" ? (
              <div style={{ 
                marginBottom: "16px", 
                padding: "12px 16px",
                background: "linear-gradient(135deg, #fff9e6 0%, #fff3d9 100%)",
                borderRadius: "8px",
                border: "1px solid #ffe4a3",
                display: "flex", 
                alignItems: "center", 
                gap: "12px" 
              }}>
                <span style={{ fontSize: "20px" }}>💡</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: "#856404", fontSize: "14px" }}>Early Insights Available</strong>
                  <div style={{ fontSize: "12px", color: "#856404", marginTop: "2px" }}>
                    Confidence improves with more data (4+ expenses recommended)
                  </div>
                </div>
                <span style={{
                  padding: "4px 12px",
                  background: "#fff",
                  border: "1px solid #ffe4a3",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#856404",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Low Confidence
                </span>
              </div>
            ) : (
              <div style={{ 
                marginBottom: "16px", 
                padding: "12px 16px",
                background: "linear-gradient(135deg, #e8f5f1 0%, #d4ebe5 100%)",
                borderRadius: "8px",
                border: "1px solid #b3ddd1",
                display: "flex", 
                alignItems: "center", 
                gap: "12px" 
              }}>
                <span style={{ fontSize: "20px" }}>✨</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: "#155724", fontSize: "14px" }}>AI-Powered Recommendations</strong>
                  <div style={{ fontSize: "12px", color: "#155724", marginTop: "2px" }}>
                    Based on your actual spending patterns
                  </div>
                </div>
                <span style={{
                  padding: "4px 12px",
                  background: "#fff",
                  border: "1px solid #b3ddd1",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#155724",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  High Confidence
                </span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {(suggestionState.data?.suggestions || []).map((suggestion, index) => {
                const isExpanded = expandedSuggestions.has(index);
                const priorityConfig = {
                  high: { color: "#dc3545", bg: "#fff5f5", icon: "⚠️", label: "High Priority" },
                  medium: { color: "#ff9800", bg: "#fff8f0", icon: "📊", label: "Medium Priority" },
                  low: { color: "#28a745", bg: "#f0f9f4", icon: "ℹ️", label: "Low Priority" }
                };
                const config = priorityConfig[suggestion.priority] || priorityConfig.low;
                
                return (
                  <div 
                    key={`${suggestion.title}-${index}`}
                    style={{
                      background: "#ffffff",
                      border: `1px solid ${isExpanded ? config.color : "#e0e0e0"}`,
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      boxShadow: isExpanded 
                        ? `0 4px 12px rgba(0,0,0,0.1), 0 0 0 3px ${config.color}20`
                        : "0 2px 4px rgba(0,0,0,0.05)",
                      transform: isExpanded ? "translateY(-2px)" : "translateY(0)",
                    }}
                    onClick={() => toggleSuggestion(index)}
                    onMouseEnter={(e) => {
                      if (!isExpanded) {
                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.08)";
                        e.currentTarget.style.borderColor = "#c0c0c0";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded) {
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                        e.currentTarget.style.borderColor = "#e0e0e0";
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{
                        minWidth: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: config.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: "700",
                        color: config.color,
                        border: `2px solid ${config.color}30`
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "16px" }}>{config.icon}</span>
                          <strong style={{ 
                            fontSize: "15px", 
                            color: "#1a1a1a",
                            lineHeight: "1.4"
                          }}>
                            {suggestion.title}
                          </strong>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{
                            padding: "3px 10px",
                            background: config.bg,
                            border: `1px solid ${config.color}40`,
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "600",
                            color: config.color,
                            textTransform: "uppercase",
                            letterSpacing: "0.3px"
                          }}>
                            {config.label}
                          </span>
                          {suggestion.confidence && (
                            <span style={{
                              padding: "3px 10px",
                              background: "#f5f5f5",
                              border: "1px solid #d0d0d0",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "500",
                              color: "#666",
                              textTransform: "capitalize"
                            }}>
                              {suggestion.confidence} confidence
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{
                        minWidth: "24px",
                        height: "24px",
                        borderRadius: "6px",
                        background: isExpanded ? config.bg : "#f5f5f5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        color: isExpanded ? config.color : "#666",
                        transition: "all 0.3s ease",
                        border: `1px solid ${isExpanded ? config.color + '40' : '#e0e0e0'}`
                      }}>
                        {isExpanded ? "−" : "+"}
                      </div>
                    </div>
                    {isExpanded && (
                      <div 
                        style={{ 
                          marginTop: "16px",
                          paddingTop: "16px",
                          borderTop: `1px solid ${config.color}20`,
                          animation: "fadeIn 0.3s ease"
                        }}
                      >
                        <div style={{
                          background: config.bg,
                          padding: "14px 16px",
                          borderRadius: "8px",
                          border: `1px solid ${config.color}30`,
                          fontSize: "14px",
                          lineHeight: "1.6",
                          color: "#333"
                        }}>
                          <div style={{ fontWeight: "600", marginBottom: "6px", color: config.color }}>
                            💼 Recommendation:
                          </div>
                          {suggestion.message}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      {suggestionState.data?.category_guidance && suggestionState.data.category_guidance.length > 0 && (
        <div className="card">
          <h3>Category Spending Guidance</h3>
          <p className="stat-card__label" style={{ marginBottom: "16px" }}>
            Smart recommendations for each spending category based on your patterns
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {suggestionState.data.category_guidance.map((guidance, index) => {
              const statusConfig = {
                overspending: { 
                  color: "#dc3545", 
                  bg: "#fff5f5", 
                  borderColor: "#dc3545", 
                  label: "Reduce Spending",
                  emoji: "⚠️"
                },
                balanced: { 
                  color: "#28a745", 
                  bg: "#f0f9f4", 
                  borderColor: "#28a745", 
                  label: "On Track",
                  emoji: "✅"
                },
                underspending: { 
                  color: "#17a2b8", 
                  bg: "#e8f7f9", 
                  borderColor: "#17a2b8", 
                  label: "Can Spend More",
                  emoji: "💡"
                }
              };
              const config = statusConfig[guidance.status] || statusConfig.balanced;
              
              return (
                <div 
                  key={`${guidance.category}-${index}`}
                  style={{
                    background: "#ffffff",
                    border: `2px solid ${config.borderColor}30`,
                    borderLeft: `5px solid ${config.borderColor}`,
                    borderRadius: "10px",
                    padding: "16px 18px",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "24px" }}>{config.emoji}</span>
                      <div>
                        <strong style={{ fontSize: "16px", color: "#1a1a1a" }}>
                          {guidance.category}
                        </strong>
                        <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                          {guidance.share_percent}% of total spending
                        </div>
                      </div>
                    </div>
                    <span style={{
                      padding: "6px 14px",
                      background: config.bg,
                      border: `1px solid ${config.borderColor}40`,
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: config.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      {config.label}
                    </span>
                  </div>
                  
                  <div style={{ 
                    background: config.bg, 
                    padding: "12px 14px", 
                    borderRadius: "8px",
                    border: `1px solid ${config.borderColor}20`,
                    marginBottom: "10px"
                  }}>
                    <div style={{ fontSize: "13px", color: "#333", lineHeight: "1.5" }}>
                      {guidance.recommendation}
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "120px" }}>
                      <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Total Spent
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "600", color: config.color }}>
                        {formatCurrency(guidance.total)}
                      </div>
                    </div>
                    
                    {guidance.potential_savings && (
                      <div style={{ flex: 1, minWidth: "120px" }}>
                        <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Potential Savings
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: "600", color: "#28a745" }}>
                          {formatCurrency(guidance.potential_savings)}
                        </div>
                      </div>
                    )}
                    
                    {guidance.target_amount && (
                      <div style={{ flex: 1, minWidth: "120px" }}>
                        <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Target Amount
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: "600", color: "#17a2b8" }}>
                          {formatCurrency(guidance.target_amount)}
                        </div>
                      </div>
                    )}
                    
                    {guidance.available_budget && (
                      <div style={{ flex: 1, minWidth: "120px" }}>
                        <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Available to Spend
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: "600", color: "#17a2b8" }}>
                          {formatCurrency(guidance.available_budget)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="card">
        <h3>Monthly breakdown</h3>
        <div className="list">
          {forecast.months.map((month) => (
            <div className="list-item" key={month.key}>
              <div>
                <strong>{month.label}</strong>
                <div className="stat-card__label">{month.key}</div>
              </div>
              <span className="stat-card__value">{formatCurrency(month.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Forecast;
