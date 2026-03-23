import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/auth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/dashboard";
  const successMessage = location.state?.message || "";
  const prefilledEmail = location.state?.email || "";
  const prefilledRole = location.state?.role || "manager";
  const [form, setForm] = useState({ email: prefilledEmail, password: "", role: prefilledRole });
  const [status, setStatus] = useState({ 
    loading: false, 
    error: "",
    success: successMessage
  });

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });
    try {
      console.log("[Login] Attempting login for:", form.email, "with selected role:", form.role);
      const user = await login({ email: form.email, password: form.password });
      console.log("[Login] Login successful for user:", user.email, "Backend role:", user.role, "Selected role:", form.role);
      
      // Redirect based on selected role (and verify user has that role)
      if (form.role === 'admin' && (user.is_staff || user.role === 'admin')) {
        console.log("[Login] Redirecting to admin/dashboard");
        navigate('/admin/dashboard', { replace: true });
      } else if (form.role === 'admin' && user.role !== 'admin' && !user.is_staff) {
        // User selected admin but doesn't have admin role
        setStatus({ loading: false, error: "You don't have admin permissions. Please select the correct role.", success: "" });
        return;
      } else {
        console.log("[Login] Redirecting to manager/employee dashboard");
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error("[Login] Login failed:", error);
      setStatus({ loading: false, error: "Invalid email or password.", success: "" });
    }
  };
  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <div className="auth-panel__badge">SmartSpend</div>
        <h1>Control spend without slowing teams.</h1>
        <p>
          Give every request context, automate approvals, and keep budgets
          moving with a real-time expense command center.
        </p>
        <ul className="feature-list">
          <li>Instant policy checks across categories and roles.</li>
          <li>Live approval queues with escalation rules.</li>
          <li>Unified receipts, cards, and reimbursements.</li>
        </ul>
        <div className="auth-stats">
          <div className="card stat-card">
            <div className="stat-card__label">Monthly spend</div>
            <div className="stat-card__value">₹482K</div>
            <div className="stat-card__label">6% below target</div>
          </div>
          <div className="card stat-card">
            <div className="stat-card__label">Open approvals</div>
            <div className="stat-card__value">19</div>
            <div className="stat-card__label">3 need attention</div>
          </div>
        </div>
      </section>
      <section className="auth-card">
        <h2>Welcome back</h2>
        <div className="auth-meta">
          Sign in to review approvals, submit expenses, and track policy health.
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="********"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="role">Login as</label>
            <select id="role" name="role" value={form.role} onChange={handleChange} required>
              <option value="manager">Manager / Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="checkbox-row">
            <label className="checkbox">
              <input type="checkbox" />
              Remember this device
            </label>
            <Link className="link" to="/login">
              Forgot password?
            </Link>
          </div>
          {status.success ? <div className="alert alert--success">{status.success}</div> : null}
          {status.error ? <div className="alert">{status.error}</div> : null}
          <button className="button button--wide" type="submit" disabled={status.loading}>
            {status.loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="auth-demo">
          <strong>Demo access</strong>
          <div>admin@smartspend.com / admin123</div>
        </div>
        <div className="auth-links">
          <Link to="/register">Create account</Link>
          <Link to="/dashboard">View demo</Link>
        </div>
      </section>
    </div>
  );
};

export default Login;
