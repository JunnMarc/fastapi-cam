import { useMemo, useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const selectOptions = {
  gender: ["Female", "Male"],
  Partner: ["Yes", "No"],
  Dependents: ["Yes", "No"],
  PhoneService: ["Yes", "No"],
  MultipleLines: ["No phone service", "No", "Yes"],
  InternetService: ["DSL", "Fiber optic", "No"],
  OnlineSecurity: ["No internet service", "No", "Yes"],
  OnlineBackup: ["No internet service", "No", "Yes"],
  DeviceProtection: ["No internet service", "No", "Yes"],
  TechSupport: ["No internet service", "No", "Yes"],
  StreamingTV: ["No internet service", "No", "Yes"],
  StreamingMovies: ["No internet service", "No", "Yes"],
  Contract: ["Month-to-month", "One year", "Two year"],
  PaperlessBilling: ["Yes", "No"],
  PaymentMethod: [
    "Electronic check",
    "Mailed check",
    "Bank transfer (automatic)",
    "Credit card (automatic)"
  ]
};

const initialState = {
  gender: "Female",
  SeniorCitizen: 0,
  Partner: "No",
  Dependents: "No",
  tenure: 12,
  PhoneService: "Yes",
  MultipleLines: "No",
  InternetService: "Fiber optic",
  OnlineSecurity: "No",
  OnlineBackup: "No",
  DeviceProtection: "No",
  TechSupport: "No",
  StreamingTV: "Yes",
  StreamingMovies: "Yes",
  Contract: "Month-to-month",
  PaperlessBilling: "Yes",
  PaymentMethod: "Electronic check",
  MonthlyCharges: 79.65,
  TotalCharges: 955.8
};

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function App() {
  const [form, setForm] = useState(initialState);
  const [result, setResult] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("auth_token") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  const riskTone = useMemo(() => {
    if (!result) return "neutral";
    if (result.risk_level === "High") return "high";
    if (result.risk_level === "Medium") return "medium";
    return "low";
  }, [result]);

  const handleChange = (field) => (event) => {
    const value =
      event.target.type === "number"
        ? Number(event.target.value)
        : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const loadCustomers = async () => {
    if (!token) return;
    setLoadingCustomers(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/customers`, {
        headers: authHeaders
      });
      const payload = await response.json();
      setCustomers(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [token]);

  const handleLoginChange = (field) => (event) => {
    setLoginForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail || "Login failed");
      }
      const payload = await response.json();
      localStorage.setItem("auth_token", payload.access_token);
      setToken(payload.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setToken("");
    setCustomers([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail || "Prediction failed");
      }

      const created = await response.json();
      await loadCustomers();
      const score = await fetch(
        `${API_BASE}/api/v1/customers/${created.id}/score`,
        { method: "POST", headers: authHeaders }
      );
      if (!score.ok) {
        const payload = await score.json();
        throw new Error(payload.detail || "Scoring failed");
      }
      const payload = await score.json();
      setResult(payload);
      await loadCustomers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async (id) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/v1/customers/${id}/score`, {
        method: "POST",
        headers: authHeaders
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail || "Scoring failed");
      }
      const payload = await response.json();
      setResult(payload);
      await loadCustomers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="badge">Enterprise Risk Desk</p>
          <h1>Customer Attrition System</h1>
          <p className="subtitle">
            Real-time churn risk scoring with operational context for retention
            teams.
          </p>
        </div>
        <div className="hero-card">
          <p className="label">Current Model</p>
          <p className="value">Logistic Regression</p>
          <p className="meta">Balanced classes · 20% holdout validation</p>
        </div>
      </header>

      <section className="panel auth-panel">
        <div className="panel-header">
          <h2>Access Control</h2>
          <p>Sign in to manage the churn portfolio.</p>
        </div>
        {token ? (
          <div className="auth-row">
            <span className="auth-status">Authenticated</span>
            <button className="secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <form className="auth-row" onSubmit={handleLogin}>
            <input
              placeholder="Username"
              value={loginForm.username}
              onChange={handleLoginChange("username")}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={handleLoginChange("password")}
            />
            <button className="secondary" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        )}
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="grid">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <h2>Customer Intake</h2>
            <p>Create a customer and generate a churn prediction.</p>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Gender</label>
              <select value={form.gender} onChange={handleChange("gender")}>
                {selectOptions.gender.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Senior Citizen</label>
              <select
                value={form.SeniorCitizen}
                onChange={handleChange("SeniorCitizen")}
              >
                <option value={0}>0 - No</option>
                <option value={1}>1 - Yes</option>
              </select>
            </div>
            <div className="field">
              <label>Partner</label>
              <select value={form.Partner} onChange={handleChange("Partner")}>
                {selectOptions.Partner.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Dependents</label>
              <select value={form.Dependents} onChange={handleChange("Dependents")}>
                {selectOptions.Dependents.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Tenure (months)</label>
              <input
                type="number"
                min="0"
                value={form.tenure}
                onChange={handleChange("tenure")}
              />
            </div>
            <div className="field">
              <label>Monthly Charges</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.MonthlyCharges}
                onChange={handleChange("MonthlyCharges")}
              />
            </div>
            <div className="field">
              <label>Total Charges</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.TotalCharges}
                onChange={handleChange("TotalCharges")}
              />
            </div>

            {[
              "PhoneService",
              "MultipleLines",
              "InternetService",
              "OnlineSecurity",
              "OnlineBackup",
              "DeviceProtection",
              "TechSupport",
              "StreamingTV",
              "StreamingMovies",
              "Contract",
              "PaperlessBilling",
              "PaymentMethod"
            ].map((field) => (
              <div className="field" key={field}>
                <label>{field}</label>
                <select value={form[field]} onChange={handleChange(field)}>
                  {selectOptions[field].map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Create & Score"}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </form>

        <aside className={`panel result ${riskTone}`}>
          <div className="panel-header">
            <h2>Risk Outcome</h2>
            <p>Operational readiness for retention prioritization.</p>
          </div>

          {result ? (
            <div className="result-body">
              <div>
                <p className="label">Prediction</p>
                <p className="value">{result.prediction}</p>
              </div>
              <div>
                <p className="label">Churn Probability</p>
                <p className="value">{formatPercent(result.probability)}</p>
              </div>
              <div>
                <p className="label">Risk Band</p>
                <p className="value">{result.risk_level}</p>
              </div>
              <div className="callout">
                Suggested Action: {result.risk_level === "High"
                  ? "Immediate retention outreach within 48 hours."
                  : result.risk_level === "Medium"
                    ? "Targeted offer and service review."
                    : "Maintain current engagement cadence."}
              </div>
            </div>
          ) : (
            <div className="result-empty">
              <p>Submit a customer profile to see the churn score.</p>
            </div>
          )}
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Customer Registry</h2>
          <p>Track, score, and manage churn risk portfolio.</p>
        </div>
        {loadingCustomers ? (
          <p>Loading customers...</p>
        ) : (
          <div className="table">
            <div className="table-head">
              <span>ID</span>
              <span>Segment</span>
              <span>Status</span>
              <span>Risk</span>
              <span>Probability</span>
              <span>Actions</span>
            </div>
            {customers.length === 0 ? (
              <div className="table-row empty">
                <span>No customers yet.</span>
              </div>
            ) : (
              customers.map((c) => (
                <div className="table-row" key={c.id}>
                  <span>#{c.id}</span>
                  <span>{c.segment || "Unassigned"}</span>
                  <span>{c.status || "Active"}</span>
                  <span>{c.risk_level || "—"}</span>
                  <span>
                    {typeof c.churn_probability === "number"
                      ? formatPercent(c.churn_probability)
                      : "—"}
                  </span>
                  <span>
                    <button
                      className="secondary"
                      onClick={() => handleScore(c.id)}
                      disabled={loading}
                    >
                      Score
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
