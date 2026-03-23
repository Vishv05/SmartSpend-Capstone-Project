import React, { useState, useEffect } from "react";
import client from "../api/client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Doughnut, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const AdminReports = () => {
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [expensesRes, usersRes, categoriesRes] = await Promise.allSettled([
        client.get("/expenses/"),
        client.get("/users/"),
        client.get("/categories/"),
      ]);

      const expensesData = expensesRes.status === 'fulfilled' ? expensesRes.value.data : null;
      const usersData = usersRes.status === 'fulfilled' ? usersRes.value.data : null;
      const categoriesData = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : null;

      setExpenses(expensesData?.results || expensesData || []);
      setUsers(usersData?.results || usersData || []);
      setCategories(categoriesData?.results || categoriesData || []);
    } catch (error) {
      console.error("[AdminReports] Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalExpenses = expenses.length;
  const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  const approvedCount = expenses.filter(e => e.status === 'approved').length;
  const rejectedCount = expenses.filter(e => e.status === 'rejected').length;
  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const avgExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

  // Group by category
  const expensesByCategory = {};
  const countByCategory = {};
  expenses.forEach(exp => {
    const cat = exp.category_name || `Category ${exp.category}`;
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + parseFloat(exp.amount || 0);
    countByCategory[cat] = (countByCategory[cat] || 0) + 1;
  });

  // Group by user
  const expensesByUser = {};
  expenses.forEach(exp => {
    const userName = exp.user_name || `User ${exp.user}`;
    expensesByUser[userName] = (expensesByUser[userName] || 0) + parseFloat(exp.amount || 0);
  });
  const topSpenders = Object.entries(expensesByUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Monthly trend (last 6 months)
  const monthlyData = {};
  const last6Months = [-5, -4, -3, -2, -1, 0].map(offset => {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  expenses.forEach(exp => {
    const date = new Date(exp.expense_date);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (last6Months.includes(monthKey)) {
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + parseFloat(exp.amount || 0);
    }
  });

  // Chart data
  const monthlyTrendData = {
    labels: last6Months,
    datasets: [
      {
        label: 'Total Expenses (₹)',
        data: last6Months.map(month => monthlyData[month] || 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const categoryChartData = {
    labels: Object.keys(expensesByCategory),
    datasets: [
      {
        label: 'Amount (₹)',
        data: Object.values(expensesByCategory),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(14, 165, 233, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
      },
    ],
  };

  const statusPieData = {
    labels: ['Approved', 'Pending', 'Rejected'],
    datasets: [
      {
        data: [approvedCount, pendingCount, rejectedCount],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(185, 28, 28, 0.8)',
        ],
        borderColor: ['rgb(34, 197, 94)', 'rgb(249, 115, 22)', 'rgb(185, 28, 28)'],
        borderWidth: 2,
      },
    ],
  };

  const topSpendersData = {
    labels: topSpenders.map(([name]) => name),
    datasets: [
      {
        label: 'Total Spent (₹)',
        data: topSpenders.map(([, amount]) => amount),
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgb(168, 85, 247)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="page">
      <div className="page-header-admin">
        <div>
          <div className="welcome-badge">📈 Analytics</div>
          <h1 className="admin-title">Analytics & Reports</h1>
          <p className="admin-subtitle">Comprehensive insights and expense analytics</p>
        </div>
        <button className="button" onClick={loadAllData}>🔄 Refresh</button>
      </div>

      {loading ? (
        <div className="loading-state">Loading analytics...</div>
      ) : (
        <>
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>📊 Total Expenses</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{totalExpenses}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>All time</div>
              </div>
            </div>
            <div className="card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>💰 Total Amount</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>₹{(totalAmount / 100000).toFixed(1)}L</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Total spent</div>
              </div>
            </div>
            <div className="card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>✅ Approved</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>{approvedCount}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{totalExpenses > 0 ? ((approvedCount / totalExpenses) * 100).toFixed(1) : 0}% approval rate</div>
              </div>
            </div>
            <div className="card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>📈 Avg Expense</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#a855f7' }}>₹{(avgExpense / 100000).toFixed(2)}L</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Per expense</div>
              </div>
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>📈 Monthly Expense Trend (Last 6 Months)</h3>
            <Line
              data={monthlyTrendData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: true, position: 'top' },
                  tooltip: {
                    callbacks: {
                      label: (context) => `₹${(context.parsed.y / 100000).toFixed(2)}L`,
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `₹${(value / 100000).toFixed(1)}L`,
                    },
                  },
                },
              }}
            />
          </div>

          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Category Distribution */}
            {Object.keys(expensesByCategory).length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>📁 Expenses by Category</h3>
                <Doughnut
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'right' },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return `${label}: ₹${(value / 100000).toFixed(2)}L`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            )}

            {/* Status Distribution */}
            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>✅ Expense Status Distribution</h3>
              <Pie
                data={statusPieData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' },
                  },
                }}
              />
            </div>
          </div>

          {/* Top Spenders */}
          {topSpenders.length > 0 && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>👥 Top 5 Spenders</h3>
              <Bar
                data={topSpendersData}
                options={{
                  responsive: true,
                  indexAxis: 'y',
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => `₹${(context.parsed.x / 100000).toFixed(2)}L`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₹${(value / 100000).toFixed(1)}L`,
                      },
                    },
                  },
                }}
              />
            </div>
          )}

          {/* Category Details Table */}
          {Object.keys(expensesByCategory).length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>📊 Category Breakdown</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Count</th>
                    <th>Total Amount</th>
                    <th>Avg Amount</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(expensesByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => {
                      const count = countByCategory[category] || 0;
                      const avg = count > 0 ? amount / count : 0;
                      const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
                      return (
                        <tr key={category}>
                          <td><strong>{category}</strong></td>
                          <td>{count}</td>
                          <td><strong>₹{(amount / 100000).toFixed(2)}L</strong></td>
                          <td>₹{(avg / 100000).toFixed(2)}L</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ 
                                width: `${percentage}%`, 
                                height: '8px', 
                                backgroundColor: '#3b82f6', 
                                borderRadius: '4px',
                                minWidth: '2px'
                              }}></div>
                              <span>{percentage.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminReports;
