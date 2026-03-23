import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = ({ user, onSignOut }) => {
  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar__brand">SmartSpend</div>
        <div className="sidebar__tag">Expense intelligence</div>
      </div>
      {user ? (
        <div className="sidebar__user">
          <strong>{user.first_name || user.email}</strong>
          <span>{user.role}</span>
        </div>
      ) : null}
      <nav className="sidebar__nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `sidebar__link${isActive ? " sidebar__link--active" : ""}`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/expenses/new"
          className={({ isActive }) =>
            `sidebar__link${isActive ? " sidebar__link--active" : ""}`
          }
        >
          Add Expense
        </NavLink>
        <NavLink
          to="/expenses/drafts"
          className={({ isActive }) =>
            `sidebar__link${isActive ? " sidebar__link--active" : ""}`
          }
        >
          📝 My Drafts
        </NavLink>
        <NavLink
          to="/expenses/history"
          className={({ isActive }) =>
            `sidebar__link${isActive ? " sidebar__link--active" : ""}`
          }
        >
          History
        </NavLink>
        <NavLink
          to="/forecast"
          className={({ isActive }) =>
            `sidebar__link${isActive ? " sidebar__link--active" : ""}`
          }
        >
          Forecast
        </NavLink>
        <NavLink
          to="/ai-insights"
          className={({ isActive }) =>
            `sidebar__link${isActive ? " sidebar__link--active" : ""}`
          }
        >
          AI Insights
        </NavLink>
        <button className="sidebar__link" type="button" onClick={onSignOut}>
          Sign Out
        </button>
      </nav>
      <div className="sidebar__card">
        <strong>Finance Pulse</strong>
        <p>Daily spend is 12% below target. Keep it steady.</p>
      </div>
    </aside>
  );
};

export default Sidebar;
