import React, { useState, useEffect } from "react";
import { getUser } from "../api/storage";

const SessionMonitor = () => {
  const [initialUser] = useState(() => getUser());
  const [showWarning, setShowWarning] = useState(false);
  const [newUser, setNewUser] = useState(null);

  useEffect(() => {
    // Monitor storage changes from other tabs
    const handleStorageChange = (e) => {
      // Only react to changes from other tabs
      if (e.key === "smartspend_user" && e.oldValue !== e.newValue) {
        const currentUser = getUser();
        
        // If user changed or logged out in another tab
        if (!currentUser || currentUser.id !== initialUser?.id) {
          setNewUser(currentUser);
          setShowWarning(true);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [initialUser]);

  const handleReload = () => {
    window.location.reload();
  };

  if (!showWarning) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: "#ff6b6b",
      color: "white",
      padding: "12px 20px",
      zIndex: 10000,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "20px" }}>⚠️</span>
        <span>
          {newUser 
            ? `Session changed: You're now logged in as ${newUser.email} in another tab.`
            : "You've been logged out in another tab."}
        </span>
      </div>
      <button 
        onClick={handleReload}
        style={{
          backgroundColor: "white",
          color: "#ff6b6b",
          border: "none",
          padding: "8px 16px",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "600"
        }}
      >
        Reload Page
      </button>
    </div>
  );
};

export default SessionMonitor;
