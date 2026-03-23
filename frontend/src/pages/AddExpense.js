import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import PageHeader from "../components/PageHeader";
import { createExpense, fetchCategories, fetchExpenses, suggestCategory } from "../api/expenses";
import { createDraft, updateDraft } from "../api/drafts";
import { fetchAdminSettings } from "../api/adminSettings";
import { useNavigate, useLocation } from "react-router-dom";
import { formatCurrency } from "../utils/format";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const AddExpense = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const draftFromState = location.state?.draft;
  
  const fallbackCategories = [
    { id: "travel", name: "Travel" },
    { id: "meals", name: "Meals" },
    { id: "accommodation", name: "Accommodation" },
    { id: "transportation", name: "Transportation" },
    { id: "office_supplies", name: "Office Supplies" },
    { id: "software", name: "Software" },
    { id: "training", name: "Training" },
  ];
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({
    merchant: "",
    amount: "",
    expense_date: "",
    category: "",
    payment_method: "credit_card",
    description: "",
    receipt_file: null,
  });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });
  const [aiSuggestions, setAiSuggestions] = useState({ predictions: [], loading: false, message: "" });
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [adminSettings, setAdminSettings] = useState({ require_receipt_above: 0 });

  // Load draft data if passed from Drafts page
  useEffect(() => {
    if (draftFromState) {
      setForm({
        merchant: draftFromState.merchant || "",
        amount: draftFromState.amount || "",
        expense_date: draftFromState.expense_date || "",
        category: draftFromState.category?.toString() || "",
        payment_method: draftFromState.payment_method || "credit_card",
        description: draftFromState.description || "",
        receipt_file: null,
      });
      setEditingDraftId(draftFromState.id);
    }
  }, [draftFromState]);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    fetchExpenses()
      .then(setExpenses)
      .catch(() => setExpenses([]));
  }, []);

  useEffect(() => {
    fetchAdminSettings()
      .then(setAdminSettings)
      .catch(() => setAdminSettings({ require_receipt_above: 0 }));
  }, []);

  // Debounced AI category suggestion
  const getCategorySuggestions = useCallback(async (description) => {
    if (!description || description.trim().length < 5) {
      setAiSuggestions({ predictions: [], loading: false, message: "" });
      return;
    }
    
    setAiSuggestions({ predictions: [], loading: true, message: "" });
    
    try {
      const result = await suggestCategory(description);
      setAiSuggestions({
        predictions: result.predictions || [],
        loading: false,
        message: result.message || ""
      });
    } catch (error) {
      setAiSuggestions({ predictions: [], loading: false, message: "" });
    }
  }, []);

  // Debounce timer
  useEffect(() => {
    const timer = setTimeout(() => {
      getCategorySuggestions(form.description);
    }, 800); // Wait 800ms after user stops typing
    
    return () => clearTimeout(timer);
  }, [form.description, getCategorySuggestions]);

  const expenseSeries = useMemo(() => {
    const rows = expenses.length
      ? expenses
          .map((expense) => {
            const rawDate = expense.expense_date || expense.date;
            const parsed = rawDate ? new Date(rawDate) : null;
            const labelDate = parsed && !Number.isNaN(parsed.getTime())
              ? parsed.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
              : "Unknown";
            return {
              label: `${labelDate} - ${expense.merchant || expense.vendor || "Expense"}`,
              amount: Number(expense.amount || 0),
              sortKey: parsed ? parsed.getTime() : 0,
            };
          })
            .sort((a, b) => a.sortKey - b.sortKey)
          : [];

    return {
      labels: rows.map((row) => row.label),
      data: rows.map((row) => row.amount),
      total: rows.reduce((sum, row) => sum + row.amount, 0),
      count: rows.length,
    };
  }, [expenses]);

  const chartHeight = 360;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    setForm((prev) => ({ ...prev, receipt_file: event.target.files[0] }));
  };

  const applySuggestion = (categoryId) => {
    setForm((prev) => ({ ...prev, category: categoryId.toString() }));
    setAiSuggestions({ predictions: [], loading: false, message: "" });
  };

  const handleSaveDraft = async () => {
    if (!form.merchant && !form.amount && !form.description) {
      alert("Please fill in at least some fields before saving a draft.");
      return;
    }

    setStatus({ loading: true, error: "", success: "" });

    try {
      const draftPayload = {
        merchant: form.merchant,
        amount: form.amount || null,
        expense_date: form.expense_date || null,
        category: form.category || null,
        payment_method: form.payment_method,
        description: form.description,
      };

      if (editingDraftId) {
        // Update existing draft
        await updateDraft(editingDraftId, draftPayload);
        setStatus({ loading: false, error: "", success: "Draft updated successfully!" });
      } else {
        // Create new draft
        await createDraft(draftPayload);
        setStatus({ loading: false, error: "", success: "Draft saved successfully!" });
      }

      setTimeout(() => {
        setStatus({ loading: false, error: "", success: "" });
        navigate("/expenses/drafts");
      }, 1500);
    } catch (error) {
      console.error("Failed to save draft:", error);
      setStatus({ loading: false, error: "Failed to save draft. Please try again.", success: "" });
      setTimeout(() => setStatus({ loading: false, error: "", success: "" }), 3000);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validate required fields
    if (!form.merchant.trim()) {
      setStatus({ loading: false, error: "Merchant name is required", success: "" });
      return;
    }
    if (!form.amount || isNaN(form.amount) || form.amount <= 0) {
      setStatus({ loading: false, error: "Valid amount is required", success: "" });
      return;
    }
    if (!form.expense_date) {
      setStatus({ loading: false, error: "Expense date is required", success: "" });
      return;
    }
    if (!form.category) {
      setStatus({ loading: false, error: "Category is required", success: "" });
      return;
    }
    if (!form.description.trim()) {
      setStatus({ loading: false, error: "Description is required", success: "" });
      return;
    }
    
    // Validate receipt if amount exceeds threshold
    const amount = parseFloat(form.amount);
    if (amount > adminSettings.require_receipt_above && !form.receipt_file) {
      setStatus({ loading: false, error: `Receipt is required for amounts above ₹${adminSettings.require_receipt_above}`, success: "" });
      return;
    }

    setStatus({ loading: true, error: "", success: "" });
    try {
      const payload = new FormData();
      payload.append("merchant", form.merchant.trim());
      payload.append("amount", parseFloat(form.amount).toFixed(2));
      payload.append("expense_date", form.expense_date);
      payload.append("category", parseInt(form.category, 10));
      payload.append("payment_method", form.payment_method);
      payload.append("description", form.description.trim());
      if (form.receipt_file) {
        payload.append("receipt_file", form.receipt_file);
      }
      await createExpense(payload);
      window.dispatchEvent(new Event("smartspend:expenses-updated"));
      
      // Clear form after successful submission
      setForm({
        merchant: "",
        amount: "",
        expense_date: "",
        category: "",
        payment_method: "credit_card",
        description: "",
        receipt_file: null,
      });
      
      setStatus({ loading: false, error: "", success: "Expense submitted successfully!" });
      
      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate("/expenses/history");
      }, 1500);
    } catch (error) {
      console.error("Full error object:", error);
      console.error("Error response:", error.response);
      
      let errorMessage = "Unable to submit expense.";
      
      // Extract error message from backend response
      if (error.response?.data) {
        const data = error.response.data;
        
        // Handle field-level validation errors (dict format)
        if (typeof data === 'object' && !Array.isArray(data)) {
          const errors = [];
          Object.entries(data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errors.push(`${field}: ${messages[0]}`);
            } else if (typeof messages === 'string') {
              errors.push(`${field}: ${messages}`);
            }
          });
          if (errors.length > 0) {
            errorMessage = errors.join(' | ');
          }
        }
        // Handle non-field errors or single error message
        else if (data.detail) {
          errorMessage = data.detail;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus({ loading: false, error: errorMessage, success: "" });
    }
  };
  return (
    <div className="page">
      <PageHeader
        title={editingDraftId ? "Edit Draft" : "Add expense"}
        subtitle="Capture receipts and submit with the right policy context."
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              className="button button--ghost" 
              type="button"
              onClick={() => navigate("/expenses/drafts")}
            >
              📂 View All Drafts
            </button>
            <button 
              className="button button--ghost" 
              type="button"
              onClick={handleSaveDraft}
              disabled={status.loading}
            >
              💾 {editingDraftId ? "Update Draft" : "Save as Draft"}
            </button>
          </div>
        }
      />
      
      {status.success && (
        <div className="card" style={{ marginBottom: "16px", backgroundColor: "#d1fae5", border: "1px solid #6ee7b7" }}>
          <div style={{ color: "#065f46", fontWeight: "500" }}>✓ {status.success}</div>
        </div>
      )}
      
      <div className="grid grid--two">
        <div className="card">
          <h3>Expense details</h3>
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="vendor">Vendor</label>
              <input
                id="vendor"
                name="merchant"
                type="text"
                placeholder="Ex: Delta Airlines"
                value={form.merchant}
                onChange={handleChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="₹0.00"
                value={form.amount}
                onChange={handleChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="date">Expense date</label>
              <input
                id="date"
                name="expense_date"
                type="date"
                value={form.expense_date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                <option value="">Select category</option>
                {(categories.length ? categories : fallbackCategories).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="payment_method">Payment method</label>
              <select
                id="payment_method"
                name="payment_method"
                value={form.payment_method}
                onChange={handleChange}
              >
                <option value="credit_card">Credit card</option>
                <option value="debit_card">Debit card</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="description"
                placeholder="Add a short justification."
                value={form.description}
                onChange={handleChange}
                required
              />
              {aiSuggestions.loading && (
                <div style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
                  AI analyzing description...
                </div>
              )}
              {!aiSuggestions.loading && aiSuggestions.predictions.length > 0 && (
                <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f0f9ff", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1e40af" }}>
                    AI Category Suggestions:
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {aiSuggestions.predictions.map((pred) => (
                      <button
                        key={pred.category_id}
                        type="button"
                        onClick={() => applySuggestion(pred.category_id)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#fff",
                          border: "1px solid #3b82f6",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.2s"
                        }}
                      >
                        <span>{pred.category_name}</span>
                        <span style={{ fontSize: "11px", opacity: 0.7 }}>
                          {pred.confidence}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!aiSuggestions.loading && aiSuggestions.message && aiSuggestions.predictions.length === 0 && (
                <div style={{ marginTop: "8px", fontSize: "13px", color: "#666", fontStyle: "italic" }}>
                  {aiSuggestions.message}
                </div>
              )}
            </div>
            {status.error ? <div className="alert">{status.error}</div> : null}
            <button className="button" type="submit">
              {status.loading ? "Submitting..." : "Submit expense"}
            </button>
          </form>
        </div>
        <div className="card">
          <h3>All expenses (bar chart)</h3>
          <div className="chart" style={{ height: chartHeight }}>
            <Bar
              data={{
                labels: expenseSeries.labels,
                datasets: [
                  {
                    label: "Expense amount",
                    data: expenseSeries.data,
                    backgroundColor: "rgba(219, 124, 45, 0.7)",
                    borderRadius: 8,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { autoSkip: true, maxRotation: 60, minRotation: 45 },
                  },
                  y: { grid: { color: "rgba(0,0,0,0.05)" } },
                },
              }}
            />
          </div>
          <p className="stat-card__label">
            {expenseSeries.count} expenses, total {formatCurrency(expenseSeries.total)}
          </p>
        </div>
      </div>
      <div className="card">
        <h3>Receipt + policy preview</h3>
        <div className="field">
          <label htmlFor="receipt">
            Upload receipt
            {form.amount && parseFloat(form.amount) > adminSettings.require_receipt_above && (
              <span style={{ color: "#dc2626", fontWeight: "600", marginLeft: "8px" }}>*Required</span>
            )}
          </label>
          <input 
            id="receipt" 
            name="receipt_file" 
            type="file" 
            onChange={handleFileChange}
            required={form.amount && parseFloat(form.amount) > adminSettings.require_receipt_above}
          />
          {form.amount && parseFloat(form.amount) > adminSettings.require_receipt_above && (
            <div style={{ marginTop: "8px", padding: "10px", backgroundColor: "#fef2f2", border: "1px solid #fed7d7", borderRadius: "6px", color: "#991b1b", fontSize: "13px" }}>
              ⚠️ Receipt is required for amounts above ₹{adminSettings.require_receipt_above}
            </div>
          )}
        </div>
        <div className="list">
          <div className="list-item">
            <div>
              <strong>Policy match</strong>
              <div className="stat-card__label">Travel policy v3.2</div>
            </div>
            <span className="chip">Aligned</span>
          </div>
          <div className="list-item">
            <div>
              <strong>Manager review</strong>
              <div className="stat-card__label">Auto-route to J. Lee</div>
            </div>
            <span className="chip">2 hrs</span>
          </div>
          <div className="list-item">
            <div>
              <strong>Receipt check</strong>
              <div className="stat-card__label">OCR pending</div>
            </div>
            <span className="chip">Queued</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;
