import React from "react";
import { Link } from "react-router-dom";

const Topbar = ({ user, onSignOut }) => {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="topbar">
      <div className="topbar__title">Team Spend Overview</div>
      <div className="topbar__meta">
        <span className="chip">{today}</span>
        {user ? <span className="chip">{user.first_name || user.email}</span> : null}
        {user?.role ? <span className="chip chip--role">{user.role}</span> : null}
        <Link className="button" to="/expenses/new">
          + New Expense
        </Link>
        <button className="button button--ghost" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
};

export default Topbar;
