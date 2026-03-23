import React, { useState, useEffect } from "react";
import client from "../api/client";
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
import { formatCurrency } from "../utils/format";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const AdminApprovals = () => {
  const [expenses, setExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const { data } = await client.get("/expenses/");
      console.log("[AdminApprovals] Loaded expenses:", data);
      // Handle paginated response (data.results) or direct array (data)
      const expensesList = data?.results || data;
      const expensesArray = Array.isArray(expensesList) ? expensesList : [];
      
      setAllExpenses(expensesArray);
      const pending = expensesArray.filter(exp => exp.status === 'pending');
      setExpenses(pending);
      console.log("[AdminApprovals] Pending count:", pending.length);
    } catch (error) {
      console.error("[AdminApprovals] Failed to load expenses:", error);
      console.error("[AdminApprovals] Error details:", error.response);
      setExpenses([]);
      setAllExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await client.post(`/expenses/${id}/approve/`, {
        status: 'approved'
      });
      loadExpenses();
    } catch (error) {
      console.error("[AdminApprovals] Failed to approve expense:", error);
      alert("Failed to approve expense. Please try again.");
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Please enter a rejection reason (optional):");
    if (reason === null) return; // User cancelled
    
    try {
      await client.post(`/expenses/${id}/approve/`, {
        status: 'rejected',
        rejection_reason: reason || 'No reason provided'
      });
      loadExpenses();
    } catch (error) {
      console.error("[AdminApprovals] Failed to reject expense:", error);
      alert("Failed to reject expense. Please try again.");
    }
  };

  // Calculate statistics
  const stats = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0),
    avgAmount: expenses.length > 0 ? expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0) / expenses.length : 0,
  };

  // Group by category
  const byCategory = {};
  expenses.forEach(exp => {
    const cat = exp.category_name || `Category ${exp.category}`;
    if (!byCategory[cat]) byCategory[cat] = 0;
    byCategory[cat] += parseFloat(exp.amount || 0);
  });

  // Group by status for all expenses
  const byStatus = {
    pending: allExpenses.filter(e => e.status === 'pending').length,
    approved: allExpenses.filter(e => e.status === 'approved').length,
    rejected: allExpenses.filter(e => e.status === 'rejected').length,
  };

  const categoryChartData = {
    labels: Object.keys(byCategory),
    datasets: [
      {
        label: 'Amount (₹)',
        data: Object.values(byCategory),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(249, 115, 22)',
          'rgb(168, 85, 247)',
          'rgb(236, 72, 153)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const statusChartData = {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [
      {
        label: 'Count',
        data: [byStatus.pending, byStatus.approved, byStatus.rejected],
        backgroundColor: [
          'rgba(249, 115, 22, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(185, 28, 28, 0.8)',
        ],
        borderColor: [
          'rgb(249, 115, 22)',
          'rgb(34, 197, 94)',
          'rgb(185, 28, 28)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const filteredExpenses = filter === 'pending' ? expenses : allExpenses.filter(e => e.status === filter);

  return (
    <div className="page">
      <div className="page-header-admin">
        <div>
          <div className="welcome-badge">✅ Approval Queue</div>
          <h1 className="admin-title">Expense Approvals</h1>
          <p className="admin-subtitle">Review and approve pending expense requests from employees</p>
        </div>
        <button className="button" onClick={() => loadExpenses()}>🔄 Refresh</button>
      </div>

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Pending Approvals</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f97316' }}>{stats.total}</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Awaiting review</div>
          </div>
        </div>
        <div className="card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Amount</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>₹{(stats.totalAmount / 100000).toFixed(1)}L</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Total pending</div>
          </div>
        </div>
        <div className="card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Average Amount</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>₹{(stats.avgAmount / 100000).toFixed(2)}L</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Per expense</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {Object.keys(byCategory).length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>📊 Expenses by Category</h3>
            <Bar 
              data={categoryChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
        )}
        {allExpenses.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>📈 Expense Status Distribution</h3>
            <Doughnut 
              data={statusChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom' },
                },
              }}
            />
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['pending', 'approved', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: filter === status ? '#3b82f6' : '#e5e7eb',
              color: filter === status ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: filter === status ? '600' : '500',
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} ({byStatus[status]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">Loading approvals...</div>
      ) : filteredExpenses.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state__icon">✓</div>
          <div className="empty-state__title">All caught up!</div>
          <div className="empty-state__desc">No {filter} expenses at the moment</div>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
                {filter === 'pending' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(expense => (
                <tr key={expense.id}>
                  <td>{expense.user_name || `User #${expense.user}`}</td>
                  <td>{expense.description}</td>
                  <td>{expense.category_name || expense.category}</td>
                  <td><strong>₹{parseFloat(expense.amount).toLocaleString('en-IN')}</strong></td>
                  <td>{new Date(expense.expense_date).toLocaleDateString()}</td>
                  {filter === 'pending' && (
                    <td>
                      <button 
                        className="button button--success button--sm"
                        onClick={() => handleApprove(expense.id)}
                      >
                        Approve
                      </button>
                      <button 
                        className="button button--danger button--sm"
                        onClick={() => handleReject(expense.id)}
                      >
                        Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;
