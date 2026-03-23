import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { profile } from "../api/auth";
import { clearSession, getTokens, getUser } from "../api/storage";

const RequireAuth = ({ children, roles }) => {
  const location = useLocation();
  const tokens = getTokens();
  const [user, setUser] = useState(getUser());
  const [checking, setChecking] = useState(!!tokens?.access);

  // Listen for user changes (including from other tabs)
  useEffect(() => {
    const syncUser = () => {
      const currentUser = getUser();
      setUser(currentUser);
      if (!currentUser) {
        setChecking(false);
      }
    };
    
    window.addEventListener("smartspend:user", syncUser);
    window.addEventListener("storage", syncUser);
    
    return () => {
      window.removeEventListener("smartspend:user", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    if (!tokens?.access || user) {
      setChecking(false);
      return;
    }

    profile()
      .then((data) => {
        setUser(data);
        setChecking(false);
      })
      .catch(() => {
        clearSession();
        setChecking(false);
      });
  }, [tokens?.access, user]);

  if (!tokens?.access) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (checking) {
    return (
      <div className="page">
        <div className="state-card">
          <h3>Loading workspace</h3>
          <p>Syncing your profile and permissions.</p>
        </div>
      </div>
    );
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="page">
        <div className="state-card">
          <h3>Access restricted</h3>
          <p>You do not have permission to view this section.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default RequireAuth;
