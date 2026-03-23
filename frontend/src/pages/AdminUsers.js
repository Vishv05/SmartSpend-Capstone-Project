import React, { useState, useEffect } from "react";
import client from "../api/client";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data } = await client.get("/users/");
      console.log("[AdminUsers] Loaded users:", data);
      // Handle paginated response (data.results) or direct array (data)
      const usersList = data?.results || data;
      setUsers(Array.isArray(usersList) ? usersList : []);
    } catch (error) {
      console.error("[AdminUsers] Failed to load users:", error);
      console.error("[AdminUsers] Error details:", error.response);
      setUsers([]); // Ensure users is always an array
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    if (filter === "all") return true;
    return user.role === filter;
  }) : [];

  return (
    <div className="page">
      <div className="page-header-admin">
        <div>
          <div className="welcome-badge">👥 User Management</div>
          <h1 className="admin-title">Manage Users</h1>
          <p className="admin-subtitle">View, edit, and control user accounts and permissions</p>
        </div>
        <button className="button">+ Add New User</button>
      </div>

      <div className="filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Users ({Array.isArray(users) ? users.length : 0})
        </button>
        <button 
          className={`filter-btn ${filter === 'employee' ? 'active' : ''}`}
          onClick={() => setFilter('employee')}
        >
          Employees ({Array.isArray(users) ? users.filter(u => u.role === 'employee').length : 0})
        </button>
        <button 
          className={`filter-btn ${filter === 'manager' ? 'active' : ''}`}
          onClick={() => setFilter('manager')}
        >
          Managers ({Array.isArray(users) ? users.filter(u => u.role === 'manager').length : 0})
        </button>
        <button 
          className={`filter-btn ${filter === 'admin' ? 'active' : ''}`}
          onClick={() => setFilter('admin')}
        >
          Admins ({Array.isArray(users) ? users.filter(u => u.role === 'admin').length : 0})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading users...</div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{user.first_name?.[0] || user.username[0]}</div>
                      <div>
                        <div className="user-name">{user.first_name} {user.last_name}</div>
                        <div className="user-meta">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge badge--${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.department || '-'}</td>
                  <td>
                    <span className="badge badge--success">Active</span>
                  </td>
                  <td>
                    <button className="btn-link">Edit</button>
                    <button className="btn-link">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
