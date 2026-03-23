import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import SessionMonitor from "./SessionMonitor";
import { clearSession, getUser } from "../api/storage";

const AppShell = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    const syncUser = () => {
      const currentUser = getUser();
      setUser(currentUser);
      
      // If user changed to admin/manager, redirect to appropriate dashboard
      if (currentUser && (currentUser.is_staff || currentUser.role === 'admin')) {
        navigate("/admin/dashboard", { replace: true });
      }
    };
    
    window.addEventListener("smartspend:user", syncUser);
    window.addEventListener("storage", syncUser);
    
    return () => {
      window.removeEventListener("smartspend:user", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, [navigate]);

  const handleSignOut = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <SessionMonitor />
      <Sidebar user={user} onSignOut={handleSignOut} />
      <div className="app-shell__main">
        <Topbar user={user} onSignOut={handleSignOut} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
