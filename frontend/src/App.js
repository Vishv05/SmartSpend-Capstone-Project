import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import AppShell from "./components/AppShell";
import AdminShell from "./components/AdminShell";
import RequireAuth from "./components/RequireAuth";
import RequireGuest from "./components/RequireGuest";
import RequireAdmin from "./components/RequireAdmin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddExpense from "./pages/AddExpense";
import Drafts from "./pages/Drafts";
import History from "./pages/History";
import Forecast from "./pages/Forecast";
import AIInsights from "./pages/AIInsights";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminCategories from "./pages/AdminCategories";
import AdminApprovals from "./pages/AdminApprovals";
import AdminReports from "./pages/AdminReports";
import AdminSettings from "./pages/AdminSettings";
import DebugInfo from "./pages/DebugInfo";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/login"
          element={
            <RequireGuest>
              <Login />
            </RequireGuest>
          }
        />
        <Route
          path="/register"
          element={
            <RequireGuest>
              <Register />
            </RequireGuest>
          }
        />
        
        {/* User Routes */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/expenses/add" element={<AddExpense />} />
          <Route path="/expenses/new" element={<AddExpense />} />
          <Route path="/expenses/drafts" element={<Drafts />} />
          <Route path="/expenses/history" element={<History />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/ai-insights" element={<AIInsights />} />
        </Route>
        
        {/* Admin Routes */}
        <Route
          element={
            <RequireAdmin>
              <AdminShell />
            </RequireAdmin>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/debug" element={<DebugInfo />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
