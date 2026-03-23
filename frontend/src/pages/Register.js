import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerWithoutLogin } from "../api/auth";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    role: "manager",
    department: "",
  });
  const [status, setStatus] = useState({ loading: false, error: "" });

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirm_password) {
      setStatus({ loading: false, error: "Passwords do not match." });
      return;
    }

    setStatus({ loading: true, error: "" });
    try {
      console.log("[Register] Sending registration request:", {
        username: form.email,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
        department: form.department
      });
      
      await registerWithoutLogin({
        username: form.email,
        email: form.email,
        password: form.password,
        confirm_password: form.confirm_password,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
        department: form.department,
      });
      
      console.log("[Register] Registration successful!");
      
      // Redirect to login page with role info for UX
      navigate("/login", { 
        replace: true,
        state: { 
          message: "Registration successful! Please login.",
          email: form.email,
          role: form.role
        }
      });
    } catch (error) {
      console.error("[Register] Registration error:", error);
      console.error("[Register] Error response:", error?.response?.data);
      
      const response = error?.response?.data;
      if (response && typeof response === "object") {
        const messages = Object.entries(response)
          .map(([key, value]) => {
            const formatted = Array.isArray(value) ? value.join(" ") : String(value);
            return `${key}: ${formatted}`;
          })
          .join(" | ");
        setStatus({ loading: false, error: messages || "Registration failed." });
        return;
      }
      setStatus({ loading: false, error: error?.message || "Registration failed. Check your details." });
    }
  };
  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <div className="auth-panel__badge">SmartSpend</div>
        <h1>Launch a finance command center.</h1>
        <p>
          Configure roles, connect cards, and route approvals in minutes.
          SmartSpend keeps every team in the loop.
        </p>
        <ul className="feature-list">
          <li>Invite teammates and auto-assign managers.</li>
          <li>Instant spend limits by department and category.</li>
          <li>Live analytics and audit-ready trails.</li>
        </ul>
        <div className="auth-stats">
          <div className="card stat-card">
            <div className="stat-card__label">Policy coverage</div>
            <div className="stat-card__value">92%</div>
            <div className="stat-card__label">Automated checks</div>
          </div>
          <div className="card stat-card">
            <div className="stat-card__label">Average approval</div>
            <div className="stat-card__value">2.4 hrs</div>
            <div className="stat-card__label">Top quartile</div>
          </div>
        </div>
      </section>
      <section className="auth-card">
        <h2>Create your account</h2>
        <div className="auth-meta">Start with a demo workspace and invite your team later.</div>
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="first_name">First name</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              placeholder="Taylor"
              value={form.first_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="last_name">Last name</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              placeholder="Morgan"
              value={form.last_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="department">Department</label>
            <input
              id="department"
              name="department"
              type="text"
              placeholder="Finance"
              value={form.department}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label htmlFor="role">Role</label>
            <select id="role" name="role" value={form.role} onChange={handleChange}>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
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
              placeholder="Create password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirm_password">Confirm password</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              placeholder="Repeat password"
              value={form.confirm_password}
              onChange={handleChange}
              required
            />
          </div>
          {status.error ? <div className="alert">{status.error}</div> : null}
          <button className="button button--wide" type="submit">
            {status.loading ? "Creating..." : "Create workspace"}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">Already have an account?</Link>
          <Link to="/dashboard">View demo</Link>
        </div>
      </section>
    </div>
  );
};

export default Register;
