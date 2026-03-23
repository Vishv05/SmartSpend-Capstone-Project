import React, { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import { formatCurrency } from "../utils/format";

const initialForm = { name: "", description: "", icon: "", monthly_limit: "" };

// Icon mapper - converts text icon names to emoji icons
const getIconEmoji = (iconName) => {
  const iconMap = {
    travel: "✈️",
    hotel: "🏨",
    accommodation: "🏨",
    meals: "🍽️",
    food: "🍽️",
    transport: "🚗",
    transportation: "🚗",
    office: "📎",
    supplies: "📦",
    software: "💻",
    training: "📚",
    education: "🎓",
    health: "🏥",
    entertainment: "🎭",
    folder: "📁",
    default: "📁",
  };
  
  const key = (iconName || "default").toLowerCase().trim();
  return iconMap[key] || iconMap.default;
};

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get("/categories/");
      const list = data?.results || data;
      setCategories(Array.isArray(list) ? list : []);
    } catch (loadError) {
      setError("Failed to load categories.");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const beginCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
    setError("");
  };

  const beginEdit = (category) => {
    setEditingId(category.id);
    setForm({
      name: category.name || "",
      description: category.description || "",
      icon: category.icon || "",
      monthly_limit: category.monthly_limit || "",
    });
    setShowForm(true);
    setError("");
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon.trim(),
      monthly_limit: form.monthly_limit === "" ? null : form.monthly_limit,
    };
    try {
      if (editingId) {
        await client.patch(`/categories/${editingId}/`, payload);
      } else {
        await client.post("/categories/", payload);
      }
      cancelForm();
      await loadCategories();
    } catch (submitError) {
      setError(editingId ? "Failed to update category." : "Failed to create category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const confirmed = window.confirm(`Delete category "${category.name}"?`);
    if (!confirmed) {
      return;
    }
    try {
      await client.delete(`/categories/${category.id}/`);
      await loadCategories();
    } catch (deleteError) {
      setError("Failed to delete category.");
    }
  };

  const filteredCategories = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    let rows = categories;
    if (keyword) {
      rows = rows.filter((category) => {
        const haystack = `${category.name} ${category.description || ""}`.toLowerCase();
        return haystack.includes(keyword);
      });
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortBy === "spend") {
        return (b.total_amount || 0) - (a.total_amount || 0);
      }
      if (sortBy === "usage") {
        return (b.expense_count || 0) - (a.expense_count || 0);
      }
      return (a.name || "").localeCompare(b.name || "");
    });
    return sorted;
  }, [categories, query, sortBy]);

  const metrics = useMemo(() => {
    const total = categories.length;
    const withLimit = categories.filter((category) => Number(category.monthly_limit || 0) > 0).length;
    const totalSpend = categories.reduce((sum, category) => sum + Number(category.total_amount || 0), 0);
    const top = [...categories].sort((a, b) => Number(b.total_amount || 0) - Number(a.total_amount || 0))[0];
    return {
      total,
      withLimit,
      totalSpend,
      topName: top?.name || "-",
    };
  }, [categories]);

  return (
    <div className="page">
      <div className="page-header-admin">
        <div>
          <div className="welcome-badge">Category System</div>
          <h1 className="admin-title">Expense Categories</h1>
          <p className="admin-subtitle">Create, edit, and monitor category health with spend intelligence.</p>
        </div>
        <button className="button" onClick={showForm ? cancelForm : beginCreate}>
          {showForm ? "Cancel" : "+ Create Category"}
        </button>
      </div>

      <div className="grid grid--stats" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="card stat-card">
          <div className="stat-card__label">Total Categories</div>
          <div className="stat-card__value">{metrics.total}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">With Monthly Limit</div>
          <div className="stat-card__value">{metrics.withLimit}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Total Categorized Spend</div>
          <div className="stat-card__value">{formatCurrency(metrics.totalSpend)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Top Spend Category</div>
          <div className="stat-card__value" style={{ fontSize: "1.2rem" }}>{metrics.topName}</div>
        </div>
      </div>

      {showForm ? (
        <div className="card">
          <h3>{editingId ? "Edit Category" : "Create New Category"}</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="grid grid--two">
              <div className="field">
                <label htmlFor="cat_name">Category Name</label>
                <input
                  id="cat_name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g., Travel"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="cat_icon">Icon</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    id="cat_icon"
                    type="text"
                    value={form.icon}
                    onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
                    placeholder="e.g., travel, meals, office"
                    style={{ flex: 1 }}
                  />
                  <div style={{ fontSize: "1.8rem", minWidth: 40, textAlign: "center" }}>
                    {getIconEmoji(form.icon)}
                  </div>
                </div>
                <small style={{ color: "var(--subtle)", fontSize: "0.85rem" }}>
                  Supported: travel, hotel, meals, transport, office, software, training
                </small>
              </div>
            </div>
            <div className="field">
              <label htmlFor="cat_description">Description</label>
              <input
                id="cat_description"
                type="text"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="e.g., Flights, train, taxi, parking"
              />
            </div>
            <div className="field" style={{ maxWidth: 320 }}>
              <label htmlFor="cat_limit">Monthly Limit (optional)</label>
              <input
                id="cat_limit"
                type="number"
                min="0"
                step="0.01"
                value={form.monthly_limit}
                onChange={(event) => setForm((prev) => ({ ...prev, monthly_limit: event.target.value }))}
                placeholder="e.g., 50000"
              />
            </div>
            <div className="table-actions">
              <button type="submit" className="button" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Category" : "Create Category"}
              </button>
              <button type="button" className="button button--ghost" onClick={cancelForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="card">
        <div className="table-actions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search categories..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{ minWidth: 280, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}
            />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}
            >
              <option value="name">Sort: Name</option>
              <option value="spend">Sort: Total Spend</option>
              <option value="usage">Sort: Expense Count</option>
            </select>
          </div>
          <button className="button button--ghost" onClick={loadCategories}>Refresh</button>
        </div>

        {error ? <div className="alert" style={{ marginBottom: 12 }}>{error}</div> : null}

        {loading ? (
          <div className="loading-state">Loading categories...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Icon</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Monthly Limit</th>
                  <th>Expense Count</th>
                  <th>Total Spend</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td style={{ fontSize: "1.5rem", textAlign: "center" }}>{getIconEmoji(category.icon)}</td>
                    <td><strong>{category.name}</strong></td>
                    <td>{category.description || "-"}</td>
                    <td>
                      {Number(category.monthly_limit || 0) > 0
                        ? formatCurrency(Number(category.monthly_limit || 0))
                        : "Not set"}
                    </td>
                    <td>{category.expense_count || 0}</td>
                    <td>{formatCurrency(Number(category.total_amount || 0))}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button button--small button--ghost" onClick={() => beginEdit(category)}>
                          Edit
                        </button>
                        <button className="button button--small button--danger" onClick={() => handleDelete(category)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredCategories.length ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", color: "var(--subtle)", padding: 24 }}>
                      No categories found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCategories;
