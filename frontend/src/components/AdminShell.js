import React, { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import SessionMonitor from "./SessionMonitor";
import { getUser, clearSession } from "../api/storage";
import { getAdminNotifications } from "../api/notifications";

const AdminShell = () => {
  const [user, setUser] = useState(getUser());
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const navigate = useNavigate();
  const notificationRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const data = await getAdminNotifications();
      setNotifications(data.notifications || []);
      setNotificationCount(data.pending_approvals || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchNotifications();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    const syncUser = () => {
      const currentUser = getUser();
      setUser(currentUser);
      
      // If logged out or no longer admin, redirect
      if (!currentUser) {
        navigate("/login", { replace: true });
      } else if (!currentUser.is_staff && currentUser.role !== 'admin') {
        navigate("/dashboard", { replace: true });
      }
    };
    
    window.addEventListener("smartspend:user", syncUser);
    window.addEventListener("storage", syncUser);
    
    return () => {
      window.removeEventListener("smartspend:user", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, [navigate]);

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  const handleSwitchToUser = () => {
    navigate("/dashboard");
  };

  const openNotification = (notification) => {
    setSelectedNotification(notification);
  };

  const closeNotificationModal = () => {
    setSelectedNotification(null);
  };

  return (
    <div className="app-shell">
      <SessionMonitor />
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="brand-logo">💰</div>
          <div>
            <div className="brand-name">SmartSpend</div>
            <div className="brand-tagline">Admin Portal</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          <div className="nav-section">📍 ADMIN PANEL</div>
          <NavLink to="/admin/dashboard" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/users" className="nav-item">
            <span className="nav-icon">👥</span>
            <span>User Management</span>
          </NavLink>
          <NavLink to="/admin/categories" className="nav-item">
            <span className="nav-icon">📁</span>
            <span>Categories</span>
          </NavLink>
          <NavLink to="/admin/approvals" className="nav-item">
            <span className="nav-icon">✅</span>
            <span>Expense Approvals</span>
          </NavLink>
          <NavLink to="/admin/reports" className="nav-item">
            <span className="nav-icon">📈</span>
            <span>Analytics & Reports</span>
          </NavLink>
          <NavLink to="/admin/settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </NavLink>
          <NavLink to="/admin/debug" className="nav-item">
            <span className="nav-icon">🐛</span>
            <span>Debug Info</span>
          </NavLink>
        </nav>

        <div className="sidebar__footer">
          <div className="nav-section">🔄 QUICK SWITCH</div>
          <button className="nav-item nav-item--switch" onClick={handleSwitchToUser}>
            <span className="nav-icon">👤</span>
            <span>User Dashboard</span>
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar__left">
            <h2 className="topbar__title">Admin Control Panel</h2>
            <p className="topbar__subtitle">Manage users, expenses, and system settings</p>
          </div>
          <div className="topbar__actions">
            <div style={{ position: "relative" }} ref={notificationRef}>
              <button 
                className="icon-btn" 
                title="Notifications"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ position: "relative" }}
              >
                {notificationCount > 0 && (
                  <span className="icon-btn__badge">{notificationCount}</span>
                )}
                🔔
              </button>
              
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h4>Notifications</h4>
                    <button 
                      className="button button--small button--ghost" 
                      onClick={fetchNotifications}
                      disabled={loadingNotifications}
                    >
                      {loadingNotifications ? "⟳" : "Refresh"}
                    </button>
                  </div>
                  
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <span style={{ fontSize: "2rem", marginBottom: 8 }}>✅</span>
                        <p>No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`notification-item notification-item--${notification.type}`}
                          onClick={() => openNotification(notification)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="notification-icon">
                            {notification.type === 'approval_pending' && '⏳'}
                            {notification.type === 'budget_alert' && '⚠️'}
                            {notification.type === 'budget_exceeded' && '🚨'}
                            {notification.type === 'expense_submitted' && '📝'}
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">{notification.title}</div>
                            <div className="notification-message">{notification.message}</div>
                            <div className="notification-time">
                              {new Date(notification.timestamp).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="notification-footer">
                      <button 
                        className="button button--ghost button--small"
                        onClick={() => {
                          navigate('/admin/approvals');
                          setShowNotifications(false);
                        }}
                      >
                        View All Approvals →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button className="icon-btn" title="Settings" onClick={() => navigate("/admin/settings")}>
              ⚙️
            </button>
            <div className="user-menu">
              <div className="user-avatar">{user.first_name?.[0] || user.username[0]}</div>
              <div className="user-info">
                <div className="user-name">{user.first_name || user.username}</div>
                <div className="user-role">Administrator</div>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                Logout →
              </button>
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      {selectedNotification && (
        <div className="notification-modal-overlay" onClick={closeNotificationModal}>
          <div className="notification-modal" onClick={(event) => event.stopPropagation()}>
            <div className="notification-modal__header">
              <h3>{selectedNotification.title}</h3>
              <button className="icon-btn" onClick={closeNotificationModal} title="Close">
                ✕
              </button>
            </div>

            <div className="notification-modal__body">
              <div className="notification-detail">
                <div className="notification-detail__label">Type</div>
                <div className="notification-detail__value">{selectedNotification.type}</div>
              </div>

              <div className="notification-detail">
                <div className="notification-detail__label">Message</div>
                <div className="notification-detail__value notification-detail__message">{selectedNotification.message}</div>
              </div>

              <div className="notification-detail">
                <div className="notification-detail__label">Manager Details</div>
                <div className="notification-detail__value">
                  <div>Name: {selectedNotification.manager?.name || "Not assigned"}</div>
                  <div>Email: {selectedNotification.manager?.email || "N/A"}</div>
                  <div>Department: {selectedNotification.manager?.department || "N/A"}</div>
                </div>
              </div>

              <div className="notification-detail">
                <div className="notification-detail__label">Time</div>
                <div className="notification-detail__value">
                  {new Date(selectedNotification.timestamp).toLocaleString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            </div>

            <div className="notification-modal__footer">
              {selectedNotification.link && (
                <button
                  className="button"
                  onClick={() => {
                    navigate(selectedNotification.link);
                    setShowNotifications(false);
                    closeNotificationModal();
                  }}
                >
                  Go to Action
                </button>
              )}
              <button className="button button--ghost" onClick={closeNotificationModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminShell;
