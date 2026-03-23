import React from "react";
import { Navigate } from "react-router-dom";
import { getTokens } from "../api/storage";

const RequireGuest = ({ children }) => {
  const tokens = getTokens();
  if (tokens?.access) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default RequireGuest;
