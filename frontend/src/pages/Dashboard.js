import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import StatusPill from "../components/StatusPill";
import BudgetWidget from "../components/BudgetWidget";
import { fetchAnalytics, fetchExpenses } from "../api/expenses";
import { formatCurrency } from "../utils/format";

const recentExpenses = [
  { id: 1, vendor: "Aurora Travel", amount: "₹2,430", status: "Approved" },
  { id: 2, vendor: "Northwind Cloud", amount: "₹1,180", status: "Pending" },
  { id: 3, vendor: "Beacon Studio", amount: "₹860", status: "Rejected" },
];

const alerts = [
  { id: 1, title: "Policy override", detail: "3 expenses over ₹2,000" },
  { id: 2, title: "Card sync", detail: "Last sync 2 hours ago" },
  { id: 3, title: "Receipt gap", detail: "9 expenses missing receipts" },
];

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [recent, setRecent] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });

  const categoryLabels = analytics
    ? Object.keys(analytics.category_breakdown || {})
    : [];
  const categoryValues = analytics
    ? Object.values(analytics.category_breakdown || {})
    : [];

  const categoryData = categoryLabels.length
    ? {
        labels: categoryLabels,
        datasets: [
          {
            label: "Spend",
            data: categoryValues,
            backgroundColor: [
              "rgba(219, 124, 45, 0.7)",
              "rgba(24, 76, 96, 0.65)",
              "rgba(15, 118, 110, 0.65)",
              "rgba(140, 94, 47, 0.6)",
            ],
            borderRadius: 12,
          },
        ],
      }
    : {
        labels: ["Travel", "Meals", "Software", "Office"],
        datasets: [
          {
            label: "Spend",
            data: [182000, 74000, 52000, 31000],
            backgroundColor: [
              "rgba(219, 124, 45, 0.7)",
              "rgba(24, 76, 96, 0.65)",
              "rgba(15, 118, 110, 0.65)",
              "rgba(140, 94, 47, 0.6)",
            ],
            borderRadius: 12,
          },
        ],
      };

  const approvalData = {
    labels: ["Approved", "Pending", "Rejected"],
    datasets: [
      {
        data: analytics
          ? [analytics.approved_count, analytics.pending_count, analytics.rejected_count]
          : [24, 9, 3],
        backgroundColor: ["#0f766e", "#db7c2d", "#b91c1c"],
        borderWidth: 0,
      },
    ],
  };

  useEffect(() => {
    const load = async () => {
      try {
        console.log("[Dashboard] Loading analytics and expenses...");
        const [analyticsResult, expensesResult] = await Promise.allSettled([
          fetchAnalytics(),
          fetchExpenses(),
        ]);

        console.log("[Dashboard] Analytics result:", analyticsResult);
        console.log("[Dashboard] Expenses result:", expensesResult);

        if (analyticsResult.status === "fulfilled") {
          setAnalytics(analyticsResult.value);
          console.log("[Dashboard] Analytics loaded:", analyticsResult.value);
        } else {
          console.error("[Dashboard] Analytics fetch failed:", analyticsResult.reason);
        }

        if (expensesResult.status === "fulfilled") {
          setRecent(expensesResult.value.slice(0, 3));
          console.log("[Dashboard] Expenses loaded:", expensesResult.value);
        } else {
          console.error("[Dashboard] Expenses fetch failed:", expensesResult.reason);
        }

        if (
          analyticsResult.status === "rejected" &&
          expensesResult.status === "rejected"
        ) {
          const analyticsError = analyticsResult.reason?.message || "Analytics failed";
          const expensesError = expensesResult.reason?.message || "Expenses failed";
          setStatus({ 
            loading: false, 
            error: `Unable to load dashboard data. ${analyticsError}. ${expensesError}` 
          });
        } else {
          setStatus({ loading: false, error: "" });
        }
      } catch (error) {
        console.error("[Dashboard] Unexpected error:", error);
        setStatus({ loading: false, error: "Unable to load dashboard data. Check console for details." });
      }
    };
    load();
  }, []);
  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle="Live view of company spend, approvals, and policy health."
      />
      {status.error ? <div className="alert">{status.error}</div> : null}
      <div className="grid grid--stats">
        <StatCard
          label="Total spend"
          value={analytics ? formatCurrency(analytics.total_amount) : "--"}
          trend="This period"
        />
        <StatCard
          label="Pending approvals"
          value={analytics ? analytics.pending_count : "--"}
          trend="Needs review"
        />
        <StatCard
          label="Approved"
          value={analytics ? analytics.approved_count : "--"}
          trend="Healthy flow"
        />
        <StatCard
          label="Average expense"
          value={analytics ? formatCurrency(analytics.average_amount) : "--"}
          trend="Company wide"
        />
      </div>
      <div className="grid grid--two">
        <div className="card">
          <h3>Category mix</h3>
          <div className="chart">
            <Bar
              data={categoryData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: "rgba(0,0,0,0.05)" } },
                },
              }}
            />
          </div>
        </div>
        <div className="card">
          <h3>Recent approvals</h3>
          <div className="list">
            {(recent.length ? recent : recentExpenses).map((expense) => (
              <div key={expense.id} className="list-item">
                <div>
                  <strong>{expense.merchant || expense.vendor}</strong>
                  <div className="stat-card__label">
                    {formatCurrency(expense.amount)}
                  </div>
                </div>
                <StatusPill status={expense.status || "Pending"} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid--two">
        <div className="card">
          <h3>Approval mix</h3>
          <div className="chart">
            <Doughnut
              data={approvalData}
              options={{
                plugins: {
                  legend: { position: "bottom" },
                },
                cutout: "65%",
              }}
            />
          </div>
        </div>
        <div className="card">
          <h3>Team momentum</h3>
          <p className="stat-card__label">
            Approvals are moving 18% faster this week. Keep your reviewers in
            the loop with the new digest.
          </p>
          <div className="list">
            <div className="list-item">
              <strong>Daily digest</strong>
              <span className="chip">Enabled</span>
            </div>
            <div className="list-item">
              <strong>Escalation policy</strong>
              <span className="chip">2 hours</span>
            </div>
          </div>
        </div>
      </div>
      <BudgetWidget />
      <div className="card">
        <h3>Risk alerts</h3>
        <div className="list">
          {alerts.map((alert) => (
            <div key={alert.id} className="list-item">
              <div>
                <strong>{alert.title}</strong>
                <div className="stat-card__label">{alert.detail}</div>
              </div>
              <button className="button button--ghost" type="button">
                Review
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
