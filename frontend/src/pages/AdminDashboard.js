import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import { getUser } from "../api/storage";
import BudgetWidget from "../components/BudgetWidget";

const AdminDashboard = () => {
  const user = getUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalExpenses: 0,
    totalAmount: 0,
    pendingApprovals: 0,
    categories: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("[AdminDashboard] Loading stats...");
      
      const [usersRes, expensesRes, categoriesRes] = await Promise.allSettled([
        client.get("/users/"),
        client.get("/expenses/"),
        client.get("/categories/"),
      ]);

      console.log("[AdminDashboard] Users:", usersRes);
      console.log("[AdminDashboard] Expenses:", expensesRes);
      console.log("[AdminDashboard] Categories:", categoriesRes);

      // Handle paginated responses (data.results) or direct arrays (data)
      const usersData = usersRes.status === 'fulfilled' ? usersRes.value.data : null;
      const expensesData = expensesRes.status === 'fulfilled' ? expensesRes.value.data : null;
      const categoriesData = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : null;

      const users = usersData?.results || usersData || [];
      const expenses = expensesData?.results || expensesData || [];
      const categories = categoriesData?.results || categoriesData || [];
      
      const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      const pendingApprovals = expenses.filter(exp => exp.status === 'pending').length;

      setStats({
        totalUsers: users.length,
        totalExpenses: expenses.length,
        totalAmount,
        pendingApprovals,
        categories: categories.length,
      });

      const failedRequests = [usersRes, expensesRes, categoriesRes].filter(r => r.status === 'rejected');
      if (failedRequests.length > 0) {
        console.error("[AdminDashboard] Failed requests:", failedRequests);
        setError("Some data could not be loaded. You may need to re-login.");
      }
    } catch (error) {
      console.error("[AdminDashboard] Error loading stats:", error);
      console.error("[AdminDashboard] Error response:", error.response);
      setError(error.response?.data?.detail || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
  };

  return (
    <div className="page">
      <div className="page-header-admin">
        <div>
          <div className="welcome-badge">👋 Welcome back!</div>
          <h1 className="admin-title">System Overview</h1>
          <p className="admin-subtitle">Monitor and manage your SmartSpend platform, {user.first_name || user.username}</p>
        </div>
        <div className="header-actions">
          <button className="button button--outline" onClick={handleRefresh}>🔄 Refresh</button>
          <button className="button">⚙️ Settings</button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: '#fff3cd', border: '1px solid #ffc107', marginBottom: '24px', padding: '16px' }}>
          <strong>⚠️ Warning:</strong> {error}
          <div style={{ marginTop: '12px' }}>
            <button className="button button--sm" onClick={() => { localStorage.clear(); navigate('/login'); }}>Re-login</button>
            <button className="button button--sm button--outline" onClick={handleRefresh} style={{ marginLeft: '8px' }}>Try Again</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading statistics...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card stat-card stat-card--primary">
              <div className="stat-card__header">
                <span className="stat-card__icon">👥</span>
                <div className="stat-card__label">Total Users</div>
              </div>
              <div className="stat-card__value">{stats.totalUsers}</div>
              <div className="stat-card__footer">
                <Link to="/admin/users" className="stat-card__link">Manage users →</Link>
              </div>
            </div>
            
            <div className="card stat-card stat-card--success">
              <div className="stat-card__header">
                <span className="stat-card__icon">💰</span>
                <div className="stat-card__label">Total Expenses</div>
              </div>
              <div className="stat-card__value">{stats.totalExpenses}</div>
              <div className="stat-card__meta">₹{stats.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} spent</div>
            </div>
            
            <div className="card stat-card stat-card--warning">
              <div className="stat-card__header">
                <span className="stat-card__icon">⏰</span>
                <div className="stat-card__label">Pending Approvals</div>
              </div>
              <div className="stat-card__value">{stats.pendingApprovals}</div>
              <div className="stat-card__footer">
                <Link to="/admin/approvals" className="stat-card__link">Review now →</Link>
              </div>
            </div>
            
            <div className="card stat-card stat-card--info">
              <div className="stat-card__header">
                <span className="stat-card__icon">📁</span>
                <div className="stat-card__label">Active Categories</div>
              </div>
              <div className="stat-card__value">{stats.categories}</div>
              <div className="stat-card__footer">
                <Link to="/admin/categories" className="stat-card__link">Manage →</Link>
              </div>
            </div>
          </div>

          <div className="card admin-card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <h2>⚡ Quick Actions</h2>
              <p className="card-subtitle">Common administrative tasks</p>
            </div>
            <div className="action-grid">
              <Link to="/admin/users" className="action-card">
                <div className="action-card__icon">👥</div>
                <div className="action-card__title">User Management</div>
                <div className="action-card__desc">Add, edit, or remove users</div>
              </Link>
              
              <Link to="/admin/categories" className="action-card">
                <div className="action-card__icon">📁</div>
                <div className="action-card__title">Categories</div>
                <div className="action-card__desc">Manage expense categories</div>
              </Link>
              
              <Link to="/admin/approvals" className="action-card">
                <div className="action-card__icon">✓</div>
                <div className="action-card__title">Approvals</div>
                <div className="action-card__desc">Review pending expenses</div>
              </Link>
              
              <Link to="/admin/reports" className="action-card">
                <div className="action-card__icon">📊</div>
                <div className="action-card__title">Reports</div>
                <div className="action-card__desc">View analytics & insights</div>
              </Link>
            </div>
          </div>

          {/* Budget Overview Widget */}
          <div style={{ marginTop: '24px' }}>
            <BudgetWidget />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
