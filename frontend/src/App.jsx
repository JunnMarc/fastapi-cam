import { useMemo, useState } from "react";

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail || "Prediction failed");
      }

      const payload = await response.json();
      setResult(payload);
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

      <section className="grid">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <h2>Customer Signal Intake</h2>
            <p>Submit a profile to generate a churn prediction.</p>
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
            {loading ? "Scoring..." : "Generate Risk Score"}
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
    </div>
  );
}
