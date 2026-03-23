import React, { useEffect, useState } from "react";
import {
  fetchAdminSettings,
  updateAdminSettings,
  resetAdminSettings,
  sendSettingsTestEmail,
} from "../api/adminSettings";

const defaultSettings = {
  company_name: "SmartSpend",
  default_currency: "INR",
  budget_alert_threshold: "80",
  email_notifications: true,
  daily_digest: true,
  notification_refresh_minutes: "2",
  auto_approve_limit: "0.00",
  require_receipt_above: "0.00",
};

const AdminSettings = () => {
  const [form, setForm] = useState(defaultSettings);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [busyAction, setBusyAction] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await fetchAdminSettings();
        setForm({
          company_name: data.company_name || defaultSettings.company_name,
          default_currency: data.default_currency || defaultSettings.default_currency,
          budget_alert_threshold: String(data.budget_alert_threshold || defaultSettings.budget_alert_threshold),
          email_notifications: Boolean(data.email_notifications),
          daily_digest: Boolean(data.daily_digest),
          notification_refresh_minutes: String(data.notification_refresh_minutes || defaultSettings.notification_refresh_minutes),
          auto_approve_limit: String(data.auto_approve_limit ?? defaultSettings.auto_approve_limit),
          require_receipt_above: String(data.require_receipt_above ?? defaultSettings.require_receipt_above),
        });
      } catch (error) {
        setStatus({ error: "Unable to load settings.", success: "" });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSave = async (event) => {
    event.preventDefault();
    if (Number(form.budget_alert_threshold) < 1 || Number(form.budget_alert_threshold) > 100) {
      setStatus({ error: "Budget alert threshold must be between 1 and 100.", success: "" });
      return;
    }

    if (Number(form.notification_refresh_minutes) < 1 || Number(form.notification_refresh_minutes) > 60) {
      setStatus({ error: "Notification refresh interval must be between 1 and 60 minutes.", success: "" });
      return;
    }

    try {
      await updateAdminSettings({
        ...form,
        budget_alert_threshold: Number(form.budget_alert_threshold),
        notification_refresh_minutes: Number(form.notification_refresh_minutes),
        auto_approve_limit: Number(form.auto_approve_limit || 0),
        require_receipt_above: Number(form.require_receipt_above || 0),
      });
      setStatus({ error: "", success: "Settings saved successfully." });
    } catch (error) {
      setStatus({ error: "Unable to save settings.", success: "" });
    }
  };

  const onResetDefaults = async () => {
    try {
      setBusyAction("reset");
      const data = await resetAdminSettings();
      setForm({
        company_name: data.company_name,
        default_currency: data.default_currency,
        budget_alert_threshold: String(data.budget_alert_threshold),
        email_notifications: Boolean(data.email_notifications),
        daily_digest: Boolean(data.daily_digest),
        notification_refresh_minutes: String(data.notification_refresh_minutes),
        auto_approve_limit: String(data.auto_approve_limit),
        require_receipt_above: String(data.require_receipt_above),
      });
      setStatus({ error: "", success: "Settings reset to defaults." });
    } catch (error) {
      setStatus({ error: "Unable to reset settings.", success: "" });
    } finally {
      setBusyAction("");
    }
  };

  const onSendTestEmail = async () => {
    try {
      setBusyAction("test_email");
      const data = await sendSettingsTestEmail(testEmailRecipient.trim());
      setStatus({ error: "", success: data.detail || "Test email sent." });
    } catch (error) {
      const msg = error?.response?.data?.detail || "Unable to send test email.";
      setStatus({ error: msg, success: "" });
    } finally {
      setBusyAction("");
    }
  };

  if (loading) {
    return <div className="loading-state">Loading settings...</div>;
  }

  return (
    <div className="page">
      <div className="page-header-admin">
        <div>
          <div className="welcome-badge">System Control</div>
          <h1 className="admin-title">Admin Settings</h1>
          <p className="admin-subtitle">Configure organization-wide defaults for SmartSpend.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 780 }}>
        <h3 style={{ marginBottom: 12 }}>General Settings</h3>
        <form className="form" onSubmit={onSave}>
          <div className="grid grid--two">
            <div className="field">
              <label htmlFor="company_name">Company Name</label>
              <input
                id="company_name"
                name="company_name"
                type="text"
                value={form.company_name}
                onChange={onChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="default_currency">Default Currency</label>
              <select
                id="default_currency"
                name="default_currency"
                value={form.default_currency}
                onChange={onChange}
              >
                <option value="INR">INR (Rs)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (EUR)</option>
              </select>
            </div>
          </div>

          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="budget_alert_threshold">Budget Alert Threshold (%)</label>
            <input
              id="budget_alert_threshold"
              name="budget_alert_threshold"
              type="number"
              min="1"
              max="100"
              value={form.budget_alert_threshold}
              onChange={onChange}
            />
          </div>

          <div className="grid grid--two">
            <div className="field">
              <label htmlFor="notification_refresh_minutes">Notification Refresh (minutes)</label>
              <input
                id="notification_refresh_minutes"
                name="notification_refresh_minutes"
                type="number"
                min="1"
                max="60"
                value={form.notification_refresh_minutes}
                onChange={onChange}
              />
            </div>

            <div className="field">
              <label htmlFor="auto_approve_limit">Auto-Approve Limit ({form.default_currency})</label>
              <input
                id="auto_approve_limit"
                name="auto_approve_limit"
                type="number"
                min="0"
                step="0.01"
                value={form.auto_approve_limit}
                onChange={onChange}
              />
            </div>
          </div>

          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="require_receipt_above">Require Receipt Above ({form.default_currency})</label>
            <input
              id="require_receipt_above"
              name="require_receipt_above"
              type="number"
              min="0"
              step="0.01"
              value={form.require_receipt_above}
              onChange={onChange}
            />
          </div>

          <div className="field" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              id="email_notifications"
              name="email_notifications"
              type="checkbox"
              checked={form.email_notifications}
              onChange={onChange}
            />
            <label htmlFor="email_notifications" style={{ margin: 0 }}>Enable email notifications</label>
          </div>

          <div className="field" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              id="daily_digest"
              name="daily_digest"
              type="checkbox"
              checked={form.daily_digest}
              onChange={onChange}
            />
            <label htmlFor="daily_digest" style={{ margin: 0 }}>Enable daily admin digest</label>
          </div>

          {status.error ? <div className="alert">{status.error}</div> : null}
          {status.success ? <div className="alert" style={{ background: "#e9f9ef", color: "#157347" }}>{status.success}</div> : null}

          <div className="table-actions">
            <button type="submit" className="button">Save Settings</button>
            <button
              type="button"
              className="button button--ghost"
              onClick={onResetDefaults}
              disabled={busyAction === "reset"}
            >
              {busyAction === "reset" ? "Resetting..." : "Reset Defaults"}
            </button>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="test_email_recipient">Send Test Email</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                id="test_email_recipient"
                type="email"
                placeholder="recipient@example.com (optional)"
                value={testEmailRecipient}
                onChange={(event) => setTestEmailRecipient(event.target.value)}
                style={{ minWidth: 280 }}
              />
              <button
                type="button"
                className="button button--ghost"
                onClick={onSendTestEmail}
                disabled={busyAction === "test_email"}
              >
                {busyAction === "test_email" ? "Sending..." : "Send Test Email"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
