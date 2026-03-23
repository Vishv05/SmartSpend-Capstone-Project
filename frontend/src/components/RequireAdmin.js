import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getUser, getTokens } from "../api/storage";

const RequireAdmin = ({ children }) => {
  const [user, setUser] = useState(getUser());
  const [loading, setLoading] = useState(!getUser() && !!getTokens()?.access);
  const tokens = getTokens();

  // Listen for user changes (including from other tabs)
  useEffect(() => {
    const syncUser = () => {
      setUser(getUser());
    };
    
    // Listen to custom user change event
    window.addEventListener("smartspend:user", syncUser);
    
    // Listen to storage changes from other tabs
    window.addEventListener("storage", syncUser);
    
    return () => {
      window.removeEventListener("smartspend:user", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  // Wait for user data to be available before redirecting
  useEffect(() => {
    if (loading && !user) {
      // Give a moment for user data to be restored from storage
      const timeout = setTimeout(() => {
        const updatedUser = getUser();
        setUser(updatedUser);
        setLoading(false);
      }, 100);
      return () => clearTimeout(timeout);
    }
    setLoading(false);
  }, [loading, user]);

  // Show loading state while checking
  if (loading) {
    return (
      <div className="page">
        <div className="state-card">
          <h3>Loading admin panel</h3>
          <p>Verifying your permissions.</p>
        </div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user || !tokens?.access) {
    return <Navigate to="/login" replace />;
  }

  // If logged in but not admin, redirect to user dashboard
  if (!user.is_staff && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // User is admin, allow access
  return children;
};

export default RequireAdmin;
