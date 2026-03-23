import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import {
  askAiInsights,
  createAiGoal,
  fetchAiAdminSummary,
  fetchAiAnomalies,
  fetchAiCoach,
  fetchAiDrift,
  fetchAiForecast,
  fetchAiGoals,
  fetchAiHealthScore,
  fetchAiRecurring,
  runAiWhatIf,
  submitAiFeedback,
} from "../api/expenses";
import { getUser } from "../api/storage";
import { formatCurrency } from "../utils/format";

const AIInsights = () => {
  const user = getUser();
  const isAdmin = ["admin", "manager"].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [anomalies, setAnomalies] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [health, setHealth] = useState(null);
  const [coach, setCoach] = useState(null);
  const [goals, setGoals] = useState([]);

  const [adminSummary, setAdminSummary] = useState(null);
  const [drift, setDrift] = useState(null);

  const [question, setQuestion] = useState("");
  const [chatResponse, setChatResponse] = useState(null);

  const [whatIf, setWhatIf] = useState({ category: "Meals", reduction_percent: 10, goal_amount: "" });
  const [whatIfResult, setWhatIfResult] = useState(null);

  const [goalForm, setGoalForm] = useState({ name: "", target_amount: "", monthly_target: "" });

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const calls = [
        fetchAiAnomalies(),
        fetchAiRecurring(),
        fetchAiForecast(),
        fetchAiHealthScore(),
        fetchAiCoach(),
        fetchAiGoals(),
      ];

      if (isAdmin) {
        calls.push(fetchAiAdminSummary(), fetchAiDrift());
      }

      const results = await Promise.allSettled(calls);
      if (results[0].status === "fulfilled") setAnomalies(results[0].value.items || []);
      if (results[1].status === "fulfilled") setRecurring(results[1].value.items || []);
      if (results[2].status === "fulfilled") setForecast(results[2].value);
      if (results[3].status === "fulfilled") setHealth(results[3].value);
      if (results[4].status === "fulfilled") setCoach(results[4].value);
      if (results[5].status === "fulfilled") setGoals(results[5].value.items || []);
      if (isAdmin && results[6]?.status === "fulfilled") setAdminSummary(results[6].value);
      if (isAdmin && results[7]?.status === "fulfilled") setDrift(results[7].value);

      const allRejected = results.every((result) => result.status === "rejected");
      if (allRejected) {
        setError("Unable to load AI insights right now.");
      }
    } catch (err) {
      setError("Unable to load AI insights right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const topAnomaly = useMemo(() => anomalies[0] || null, [anomalies]);

  const sendFeedback = async (payload) => {
    try {
      await submitAiFeedback(payload);
      await loadAll();
    } catch (err) {
      setError("Unable to save feedback.");
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    try {
      const response = await askAiInsights(question.trim());
      setChatResponse(response);
    } catch (err) {
      setError("AI question failed. Please try again.");
    }
  };

  const handleWhatIf = async () => {
    try {
      const response = await runAiWhatIf({
        category: whatIf.category,
        reduction_percent: Number(whatIf.reduction_percent || 0),
        goal_amount: whatIf.goal_amount ? Number(whatIf.goal_amount) : undefined,
      });
      setWhatIfResult(response);
    } catch (err) {
      setError("What-if simulation failed.");
    }
  };

  const handleCreateGoal = async () => {
    if (!goalForm.name || !goalForm.target_amount) {
      setError("Goal name and target amount are required.");
      return;
    }
    try {
      await createAiGoal({
        name: goalForm.name,
        target_amount: Number(goalForm.target_amount),
        monthly_target: goalForm.monthly_target ? Number(goalForm.monthly_target) : undefined,
      });
      setGoalForm({ name: "", target_amount: "", monthly_target: "" });
      await loadAll();
    } catch (err) {
      setError("Unable to create goal.");
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="AI Insights"
        subtitle="Anomalies, forecasting, recurring detection, coaching, goals, what-if simulation, and explainable AI feedback."
        actions={
          <button className="button button--ghost" type="button" onClick={loadAll}>
            Refresh AI
          </button>
        }
      />

      {error ? <div className="alert">{error}</div> : null}
      {loading ? <div className="card"><p className="stat-card__label">Loading AI insights...</p></div> : null}

      <div className="grid grid--three">
        <div className="card stat-card">
          <div className="stat-card__label">Spend health score</div>
          <div className="stat-card__value">{health?.score ?? "--"}</div>
          <div className="stat-card__label">Band: {health?.band || "--"}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Projected month-end spend</div>
          <div className="stat-card__value">{forecast ? formatCurrency(forecast.projected_month_end) : "--"}</div>
          <div className="stat-card__label">Risk: {forecast?.risk_level || "--"}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__label">Detected recurring payments</div>
          <div className="stat-card__value">{recurring.length}</div>
          <div className="stat-card__label">Subscriptions likely active</div>
        </div>
      </div>

      <div className="grid grid--two">
        <div className="card">
          <h3>Anomaly detection + explainability</h3>
          {topAnomaly ? (
            <div className="list">
              {anomalies.slice(0, 5).map((item) => (
                <div key={item.expense_id} className="list-item">
                  <div>
                    <strong>{item.merchant}</strong>
                    <div className="stat-card__label">{item.reason}</div>
                    <div className="stat-card__label">
                      {formatCurrency(item.amount)} • Score {item.score} • Expected {formatCurrency(item.expected_range.min)} - {formatCurrency(item.expected_range.max)}
                    </div>
                  </div>
                  <div className="table-actions">
                    <button
                      className="button button--small button--success"
                      type="button"
                      onClick={() =>
                        sendFeedback({
                          insight_type: "anomaly",
                          insight_key: `expense-${item.expense_id}`,
                          expense_id: item.expense_id,
                          is_useful: true,
                        })
                      }
                    >
                      Useful
                    </button>
                    <button
                      className="button button--small button--danger"
                      type="button"
                      onClick={() =>
                        sendFeedback({
                          insight_type: "anomaly",
                          insight_key: `expense-${item.expense_id}`,
                          expense_id: item.expense_id,
                          is_useful: false,
                        })
                      }
                    >
                      Not useful
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="stat-card__label">No anomalies detected in recent history.</p>
          )}
        </div>

        <div className="card">
          <h3>AI coach (weekly actions)</h3>
          <div className="list">
            {(coach?.actions || []).map((action, index) => (
              <div key={`${action.title}-${index}`} className="list-item">
                <div>
                  <strong>{action.title}</strong>
                  <div className="stat-card__label">{action.message}</div>
                </div>
                <span className="chip">{action.priority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid--two">
        <div className="card">
          <h3>Smart recurring detection</h3>
          <div className="list">
            {recurring.length ? recurring.map((item, idx) => (
              <div key={`${item.merchant}-${idx}`} className="list-item">
                <div>
                  <strong>{item.merchant}</strong>
                  <div className="stat-card__label">
                    {formatCurrency(item.amount)} every ~{item.average_interval_days} days
                  </div>
                  <div className="stat-card__label">Next expected: {item.next_expected_date}</div>
                </div>
                <span className="chip">{Math.round((item.confidence || 0) * 100)}% conf</span>
              </div>
            )) : <p className="stat-card__label">No recurring payments detected yet.</p>}
          </div>
        </div>

        <div className="card">
          <h3>What-if simulator</h3>
          <div className="form">
            <div className="field">
              <label>Category</label>
              <input
                value={whatIf.category}
                onChange={(e) => setWhatIf((prev) => ({ ...prev, category: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Reduction %</label>
              <input
                type="number"
                min="0"
                max="80"
                value={whatIf.reduction_percent}
                onChange={(e) => setWhatIf((prev) => ({ ...prev, reduction_percent: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Goal amount (optional)</label>
              <input
                type="number"
                min="0"
                value={whatIf.goal_amount}
                onChange={(e) => setWhatIf((prev) => ({ ...prev, goal_amount: e.target.value }))}
              />
            </div>
            <button className="button" type="button" onClick={handleWhatIf}>
              Run simulation
            </button>
          </div>
          {whatIfResult ? (
            <div className="card card--soft" style={{ marginTop: 16 }}>
              <div className="stat-card__label">Monthly savings estimate</div>
              <strong>{formatCurrency(whatIfResult.monthly_savings_estimate || 0)}</strong>
              <div className="stat-card__label">Annual: {formatCurrency(whatIfResult.annual_savings_estimate || 0)}</div>
              {whatIfResult.months_to_goal ? (
                <div className="stat-card__label">Goal ETA: {whatIfResult.months_to_goal} months</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid--two">
        <div className="card">
          <h3>Goal intelligence</h3>
          <div className="form">
            <div className="field">
              <label>Goal name</label>
              <input
                value={goalForm.name}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Target amount</label>
              <input
                type="number"
                min="1"
                value={goalForm.target_amount}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, target_amount: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Monthly target</label>
              <input
                type="number"
                min="0"
                value={goalForm.monthly_target}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, monthly_target: e.target.value }))}
              />
            </div>
            <button className="button" type="button" onClick={handleCreateGoal}>
              Add goal
            </button>
          </div>

          <div className="list" style={{ marginTop: 16 }}>
            {goals.length ? goals.map((goal) => (
              <div key={goal.id} className="list-item">
                <div>
                  <strong>{goal.name}</strong>
                  <div className="stat-card__label">
                    Success probability {goal.probability_percent}% • ETA {goal.months_to_goal || "--"} months
                  </div>
                  <div className="stat-card__label">
                    Recommended weekly cap: {formatCurrency(goal.recommended_weekly_cap || 0)}
                  </div>
                </div>
                <span className="chip">Target {formatCurrency(goal.target_amount)}</span>
              </div>
            )) : <p className="stat-card__label">No active goals yet.</p>}
          </div>
        </div>

        <div className="card">
          <h3>Conversational insights</h3>
          <div className="field">
            <label>Ask AI</label>
            <input
              placeholder="Where did my money leak last month?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <button className="button" type="button" onClick={handleAsk} style={{ marginTop: 12 }}>
            Ask
          </button>
          {chatResponse ? (
            <div className="card card--soft" style={{ marginTop: 16 }}>
              <strong>Answer</strong>
              <p className="stat-card__label">{chatResponse.answer}</p>
            </div>
          ) : null}
        </div>
      </div>

      {isAdmin ? (
        <div className="grid grid--two">
          <div className="card">
            <h3>Admin AI summary</h3>
            <div className="stat-card__label">Top spend categories and risk users.</div>
            <div className="list" style={{ marginTop: 12 }}>
              {(adminSummary?.top_categories || []).map((item) => (
                <div className="list-item" key={item.category}>
                  <strong>{item.category}</strong>
                  <span className="chip">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Model drift monitoring</h3>
            <div className="list-item">
              <strong>Status</strong>
              <span className="chip">{drift?.drift_status || "--"}</span>
            </div>
            <div className="list-item">
              <strong>Feedback count</strong>
              <span className="chip">{drift?.feedback_count ?? "--"}</span>
            </div>
            <div className="list-item">
              <strong>Helpful ratio</strong>
              <span className="chip">
                {drift?.helpful_ratio === null || drift?.helpful_ratio === undefined
                  ? "--"
                  : `${Math.round(drift.helpful_ratio * 100)}%`}
              </span>
            </div>
            <p className="stat-card__label" style={{ marginTop: 10 }}>
              {drift?.message || "Collect insight feedback to activate drift monitoring."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AIInsights;
