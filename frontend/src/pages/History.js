import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { approveExpense, fetchExpenses } from "../api/expenses";
import { getUser } from "../api/storage";
import { formatCurrency } from "../utils/format";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const fallbackExpenses = [
  {
    id: 1,
    vendor: "Aurora Travel",
    date: "Feb 14, 2026",
    amount: "₹2,430",
    status: "Approved",
  },
  {
    id: 2,
    vendor: "City Bistro",
    date: "Feb 13, 2026",
    amount: "₹214",
    status: "Pending",
  },
  {
    id: 3,
    vendor: "Northwind Cloud",
    date: "Feb 11, 2026",
    amount: "₹1,180",
    status: "Rejected",
  },
  {
    id: 4,
    vendor: "Studio Nine",
    date: "Feb 10, 2026",
    amount: "₹640",
    status: "Approved",
  },
];

const History = () => {
  const [expenses, setExpenses] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const user = getUser();
  const canApprove = ["manager", "admin"].includes(user?.role);

  const safeValue = (value) => {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value).replace(/"/g, '""');
  };

  const buildCsv = (rows) => {
    const headers = [
      "id",
      "vendor",
      "date",
      "amount",
      "status",
      "category",
      "payment_method",
      "receipt",
    ];
    const lines = rows.map((expense) => {
      const values = [
        expense.id,
        expense.merchant || expense.vendor || "",
        expense.expense_date || expense.date || "",
        expense.amount || "",
        expense.status || "pending",
        expense.category_name || expense.category || "",
        expense.payment_method || "",
        expense.receipt_file || "",
      ];
      return values.map((value) => `"${safeValue(value)}"`).join(",");
    });
    return [headers.join(","), ...lines].join("\n");
  };

  const handleExport = () => {
    const data = expenses.length ? expenses : fallbackExpenses;
    if (!data.length) {
      setStatus((prev) => ({ ...prev, error: "No expenses to export." }));
      return;
    }
    const csv = buildCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smartspend-expense-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchExpenses()
      .then((data) => {
        setExpenses(data);
        setStatus({ loading: false, error: "" });
      })
      .catch(() => setStatus({ loading: false, error: "Unable to load expenses." }));
  }, []);

  const handleApprove = async (expenseId) => {
    try {
      const updated = await approveExpense(expenseId, { status: "approved" });
      setExpenses((prev) => prev.map((row) => (row.id === expenseId ? updated : row)));
    } catch (error) {
      setStatus((prev) => ({ ...prev, error: "Unable to approve expense." }));
    }
  };

  const handleReject = async (expenseId) => {
    const reason = window.prompt("Provide a rejection reason:", "");
    if (reason === null) {
      return;
    }
    if (!reason.trim()) {
      setStatus((prev) => ({ ...prev, error: "Rejection reason is required." }));
      return;
    }
    try {
      const updated = await approveExpense(expenseId, {
        status: "rejected",
        rejection_reason: reason.trim(),
      });
      setExpenses((prev) => prev.map((row) => (row.id === expenseId ? updated : row)));
    } catch (error) {
      setStatus((prev) => ({ ...prev, error: "Unable to reject expense." }));
    }
  };

  const rows = expenses;
  const canMutate = expenses.length > 0;
  const expenseSeries = useMemo(() => {
    const dataRows = expenses.length
      ? expenses
          .map((expense) => {
            const rawDate = expense.expense_date || expense.date;
            const parsed = rawDate ? new Date(rawDate) : null;
            const labelDate = parsed && !Number.isNaN(parsed.getTime())
              ? parsed.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
              : "Unknown";
            return {
              label: `${labelDate} - ${expense.merchant || expense.vendor || "Expense"}`,
              amount: Number(expense.amount || 0),
              sortKey: parsed ? parsed.getTime() : 0,
            };
          })
          .sort((a, b) => a.sortKey - b.sortKey)
      : [];

    return {
      labels: dataRows.map((row) => row.label),
      data: dataRows.map((row) => row.amount),
    };
  }, [expenses]);

  return (
    <div className="page">
      <PageHeader
        title="Expense history"
        subtitle="Track every submission, receipt, and decision." 
        actions={
          <button className="button" type="button" onClick={handleExport} disabled={!canMutate}>
            Export report
          </button>
        }
      />
      {status.error ? <div className="alert">{status.error}</div> : null}
      {status.loading ? (
        <div className="card">
          <p className="stat-card__label">Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <h3 style={{ marginBottom: "8px" }}>No expenses yet</h3>
          <p className="stat-card__label">
            Start by adding an expense. Your history will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <table className="table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Receipt</th>
              {canApprove ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.merchant || expense.vendor}</td>
                <td>{expense.expense_date || expense.date}</td>
                <td>{formatCurrency(expense.amount)}</td>
                <td>
                  <StatusPill status={(expense.status || "pending").replace(/^./, (c) => c.toUpperCase())} />
                </td>
                <td>
                  {expense.receipt_file ? (
                    <a
                      href={`http://localhost:8000${expense.receipt_file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button--small button--outline"
                    >
                      📎 View
                    </a>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>No receipt</span>
                  )}
                </td>
                {canApprove ? (
                  <td>
                    <div className="table-actions">
                      <button
                        className="button button--small button--success"
                        type="button"
                        onClick={() => handleApprove(expense.id)}
                        disabled={!canMutate || expense.status !== "pending"}
                      >
                        Approve
                      </button>
                      <button
                        className="button button--small button--danger"
                        type="button"
                        onClick={() => handleReject(expense.id)}
                        disabled={!canMutate || expense.status !== "pending"}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
          </div>
          <div className="card">
            <h3>All expenses (bar chart)</h3>
            <div className="chart" style={{ height: 360 }}>
              <Bar
                data={{
                  labels: expenseSeries.labels,
                  datasets: [
                    {
                      label: "Expense amount",
                      data: expenseSeries.data,
                      backgroundColor: "rgba(219, 124, 45, 0.7)",
                      borderRadius: 8,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { autoSkip: true, maxRotation: 60, minRotation: 45 },
                    },
                    y: { grid: { color: "rgba(0,0,0,0.05)" } },
                  },
                }}
              />
            </div>
          </div>
          <div className="grid grid--two">
            <div className="card">
              <h3>Receipt compliance</h3>
              <p className="stat-card__label">
                92% of expenses include receipts. Focus on travel and meals to
                reach 98% compliance.
              </p>
            </div>
            <div className="card">
              <h3>Policy summary</h3>
              <div className="list">
                <div className="list-item">
                  <strong>Out of policy</strong>
                  <span className="chip">3 this month</span>
                </div>
                <div className="list-item">
                  <strong>Auto-approved</strong>
                  <span className="chip">61%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default History;
