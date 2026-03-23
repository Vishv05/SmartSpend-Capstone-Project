import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { fetchDrafts, deleteDraft, convertDraftToExpense } from "../api/drafts";
import { formatCurrency } from "../utils/format";

const Drafts = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDrafts();
      setDrafts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error("Failed to load drafts:", loadError);
      setError("Failed to load drafts.");
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (draftId) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) {
      return;
    }

    try {
      await deleteDraft(draftId);
      setSuccess("Draft deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
      await loadDrafts();
    } catch (deleteError) {
      console.error("Failed to delete draft:", deleteError);
      setError("Failed to delete draft.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleEdit = (draft) => {
    // Navigate to Add Expense page with draft data
    navigate("/expenses/add", { state: { draft } });
  };

  const handleSubmit = async (draftId) => {
    try {
      await convertDraftToExpense(draftId);
      setSuccess("Draft converted to expense and submitted!");
      setTimeout(() => {
        setSuccess("");
        navigate("/expenses/history");
      }, 2000);
      await loadDrafts();
    } catch (submitError) {
      console.error("Failed to convert draft:", submitError);
      const errorMsg = submitError.response?.data?.detail || "Failed to submit draft. Please ensure all required fields are filled.";
      setError(errorMsg);
      setTimeout(() => setError(""), 5000);
    }
  };

  const stats = {
    total: drafts.length,
    totalAmount: drafts.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0),
  };

  return (
    <div className="page">
      <PageHeader
        title="My Drafts"
        subtitle="Manage and submit your saved expense drafts"
        actions={
          <button className="button" onClick={() => navigate("/expenses/add")}>
            + Create New Expense
          </button>
        }
      />

      {/* Success/Error Messages */}
      {success && (
        <div className="card" style={{ marginBottom: "16px", backgroundColor: "#d1fae5", border: "1px solid #6ee7b7" }}>
          <div style={{ color: "#065f46", fontWeight: "500" }}>✓ {success}</div>
        </div>
      )}

      {error && (
        <div className="alert" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card stat-card">
          <div className="stat-card__label">Total Drafts</div>
          <div className="stat-card__value">{stats.total}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Total Amount</div>
          <div className="stat-card__value">{formatCurrency(stats.totalAmount)}</div>
        </div>
      </div>

      {/* Drafts List */}
      {loading ? (
        <div className="loading-state">Loading drafts...</div>
      ) : drafts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state__icon">📝</div>
          <div className="empty-state__title">No drafts yet</div>
          <div className="empty-state__desc">
            Save expense drafts to complete them later
          </div>
          <button className="button" onClick={() => navigate("/expenses/add")} style={{ marginTop: "16px" }}>
            Create Your First Draft
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {drafts.map((draft) => (
            <div key={draft.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                      {draft.merchant || draft.draft_name || "Untitled Draft"}
                    </h3>
                    {draft.amount && (
                      <span style={{ 
                        fontSize: "1.2rem", 
                        fontWeight: "600", 
                        color: "var(--primary)" 
                      }}>
                        {formatCurrency(draft.amount)}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", color: "var(--subtle)", fontSize: "0.9rem" }}>
                    {draft.category_name && (
                      <div>
                        <strong>Category:</strong> {draft.category_name}
                      </div>
                    )}
                    {draft.expense_date && (
                      <div>
                        <strong>Date:</strong> {new Date(draft.expense_date).toLocaleDateString()}
                      </div>
                    )}
                    {draft.payment_method && (
                      <div>
                        <strong>Payment:</strong> {draft.payment_method.replace('_', ' ')}
                      </div>
                    )}
                  </div>

                  {draft.description && (
                    <div style={{ 
                      marginTop: "12px", 
                      padding: "12px", 
                      backgroundColor: "var(--bg)", 
                      borderRadius: "6px",
                      fontSize: "0.9rem"
                    }}>
                      <strong>Description:</strong> {draft.description}
                    </div>
                  )}

                  <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "var(--subtle)" }}>
                    <span>Created: {new Date(draft.created_at).toLocaleString()}</span>
                    {draft.updated_at !== draft.created_at && (
                      <span style={{ marginLeft: "16px" }}>
                        Updated: {new Date(draft.updated_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="table-actions" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <button 
                  className="button" 
                  onClick={() => handleEdit(draft)}
                >
                  📝 Edit Draft
                </button>
                <button 
                  className="button button--success" 
                  onClick={() => handleSubmit(draft.id)}
                  disabled={!draft.merchant || !draft.amount || !draft.expense_date || !draft.category || !draft.description}
                  title={!draft.merchant || !draft.amount || !draft.expense_date || !draft.category || !draft.description ? "Complete all required fields to submit" : "Submit as expense"}
                >
                  ✓ Submit as Expense
                </button>
                <button 
                  className="button button--danger" 
                  onClick={() => handleDelete(draft.id)}
                >
                  🗑️ Delete
                </button>
              </div>

              {(!draft.merchant || !draft.amount || !draft.expense_date || !draft.category || !draft.description) && (
                <div style={{ 
                  marginTop: "12px", 
                  padding: "8px 12px", 
                  backgroundColor: "#fef3c7", 
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  color: "#92400e"
                }}>
                  ⚠️ Missing required fields. Please edit to complete before submitting.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Drafts;
