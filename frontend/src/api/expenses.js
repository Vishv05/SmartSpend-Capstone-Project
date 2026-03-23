import client from "./client";

const normalizeList = (data) => {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.results)) {
    return data.results;
  }
  return [];
};

export const fetchAnalytics = async () => {
  const { data } = await client.get("/expenses/analytics/");
  return data;
};

export const fetchExpenses = async () => {
  const { data } = await client.get("/expenses/");
  return normalizeList(data);
};

export const createExpense = async (payload) => {
  const { data } = await client.post("/expenses/", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const fetchCategories = async () => {
  const { data } = await client.get("/categories/");
  return normalizeList(data);
};

export const fetchAiSuggestions = async () => {
  const { data } = await client.get("/expenses/ai_suggestions/");
  return data;
};

export const approveExpense = async (expenseId, payload) => {
  const { data } = await client.post(`/expenses/${expenseId}/approve/`, payload);
  return data;
};

export const fetchAiAnomalies = async () => {
  const { data } = await client.get("/expenses/ai_anomalies/");
  return data;
};

export const fetchAiRecurring = async () => {
  const { data } = await client.get("/expenses/ai_recurring/");
  return data;
};

export const fetchAiForecast = async () => {
  const { data } = await client.get("/expenses/ai_forecast/");
  return data;
};

export const fetchAiHealthScore = async () => {
  const { data } = await client.get("/expenses/ai_health_score/");
  return data;
};

export const fetchAiCoach = async () => {
  const { data } = await client.get("/expenses/ai_coach/");
  return data;
};

export const runAiWhatIf = async (payload) => {
  const { data } = await client.post("/expenses/ai_what_if/", payload);
  return data;
};

export const askAiInsights = async (question) => {
  const { data } = await client.post("/expenses/ai_query/", { question });
  return data;
};

export const fetchAiGoals = async () => {
  const { data } = await client.get("/expenses/ai_goals/");
  return data;
};

export const createAiGoal = async (payload) => {
  const { data } = await client.post("/expenses/ai_goals/", payload);
  return data;
};

export const updateAiGoal = async (payload) => {
  const { data } = await client.patch("/expenses/ai_goal_update/", payload);
  return data;
};

export const submitAiFeedback = async (payload) => {
  const { data } = await client.post("/expenses/ai_feedback/", payload);
  return data;
};

export const fetchAiDrift = async () => {
  const { data } = await client.get("/expenses/ai_drift/");
  return data;
};

export const fetchAiAdminSummary = async () => {
  const { data } = await client.get("/expenses/ai_admin_summary/");
  return data;
};

// Budget Management
export const fetchBudgets = async () => {
  const { data } = await client.get("/budgets/");
  return normalizeList(data);
};

export const fetchBudgetStatus = async () => {
  const { data } = await client.get("/budgets/budget_status/");
  return data;
};

export const createBudget = async (payload) => {
  const { data } = await client.post("/budgets/", payload);
  return data;
};

export const updateBudget = async (budgetId, payload) => {
  const { data } = await client.patch(`/budgets/${budgetId}/`, payload);
  return data;
};

export const deleteBudget = async (budgetId) => {
  await client.delete(`/budgets/${budgetId}/`);
};

// Notifications
export const fetchMyNotifications = async () => {
  const { data } = await client.get("/notifications/my_notifications/");
  return data;
};

// AI Category Suggestions
export const suggestCategory = async (description) => {
  const { data } = await client.post("/expenses/suggest_category/", { description });
  return data;
};
