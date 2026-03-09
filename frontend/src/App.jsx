import { useMemo, useState, useEffect } from "react";
import {
  ProSidebar,
  Menu,
  MenuItem,
  SidebarHeader,
  SidebarContent,
  SidebarFooter
} from "react-pro-sidebar";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerTooltip
} from "@/components/ui/map";
import regionsData from "@/data/psgc/regions.json";
import provincesData from "@/data/psgc/provinces.json";
import citiesData from "@/data/psgc/cities.json";
import {
  FiUsers,
  FiGrid,
  FiPlusSquare,
  FiLogOut,
  FiShield
} from "react-icons/fi";
import "react-pro-sidebar/dist/css/styles.css";

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
  ],
  service_type: ["Mobile", "Fiber", "DSL", "Fixed Wireless"],
  plan_type: ["Prepaid", "Postpaid", "Hybrid"]
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
  region: "National Capital Region (NCR)",
  province: "",
  city: "",
  barangay: "",
  service_type: "Mobile",
  plan_type: "Prepaid",
  MonthlyCharges: 79.65,
  TotalCharges: 955.8
};

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

const regionCoordinatesByCode = {
  "1300000000": [121.033, 14.5995],
  "1400000000": [120.573, 17.3513],
  "0100000000": [120.2863, 16.6159],
  "0200000000": [121.774, 17.308],
  "0300000000": [120.719, 15.4826],
  "0400000000": [121.0779, 14.1667],
  "1700000000": [121.0, 12.5],
  "0500000000": [123.3778, 13.4204],
  "0600000000": [122.5726, 11.0049],
  "0700000000": [123.8854, 10.3157],
  "0800000000": [124.964, 12.2446],
  "0900000000": [122.0, 7.85],
  "1000000000": [124.6857, 8.4542],
  "1100000000": [125.6128, 7.1907],
  "1200000000": [124.6, 6.5],
  "1600000000": [125.5, 9.0],
  "1900000000": [124.25, 7.2]
};

export default function App() {
  const [form, setForm] = useState(initialState);
  const [result, setResult] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("auth_token") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ username: "", password: "", is_admin: 0 });
  const [activeModal, setActiveModal] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

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

  const handleRegionChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      region: value,
      province: "",
      city: ""
    }));
  };

  const handleProvinceChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      province: value,
      city: ""
    }));
  };

  const handleCityChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      city: value
    }));
  };

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const regionOptions = useMemo(
    () => regionsData.slice().sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const selectedRegion = useMemo(
    () => regionOptions.find((r) => r.name === form.region),
    [form.region, regionOptions]
  );
  const provinceOptions = useMemo(() => {
    if (!selectedRegion) return [];
    return provincesData
      .filter((p) => p.region_code === selectedRegion.code)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedRegion]);
  const selectedProvince = useMemo(
    () => provinceOptions.find((p) => p.name === form.province),
    [form.province, provinceOptions]
  );
  const cityOptions = useMemo(() => {
    if (selectedProvince) {
      return citiesData
        .filter((c) => c.province_code === selectedProvince.code)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    if (selectedRegion) {
      return citiesData
        .filter(
          (c) =>
            c.region_code === selectedRegion.code &&
            (c.province_code === null || c.province_code === "")
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }, [selectedRegion, selectedProvince]);
  const regionCoordinatesByName = useMemo(() => {
    const map = {};
    for (const region of regionsData) {
      const coords = regionCoordinatesByCode[region.code];
      if (coords) {
        map[region.name] = coords;
      }
    }
    return map;
  }, []);

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
    loadUsers();
    loadInsights();
  }, [token]);

  const loadInsights = async () => {
    if (!token) return;
    setLoadingInsights(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/insights`, {
        headers: authHeaders
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      setInsights(payload);
    } catch {
      // ignore
    } finally {
      setLoadingInsights(false);
    }
  };

  const loadUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/v1/users`, {
        headers: authHeaders
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      setUsers(payload);
    } catch {
      // ignore
    }
  };

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
      await loadUsers();
      setActiveModal(null);
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
    setUsers([]);
  };

  const handleUserChange = (field) => (event) => {
    const value =
      event.target.type === "number"
        ? Number(event.target.value)
        : event.target.value;
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/v1/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(userForm)
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail || "User creation failed");
      }
      setUserForm({ username: "", password: "", is_admin: 0 });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
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
      await loadInsights();
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
      await loadInsights();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`app-shell ${token ? "authed" : "guest"}`}>
      {token ? (
        <aside className="sidebar">
          <ProSidebar>
            <SidebarHeader>
              <div className="sidebar-brand">
                <FiShield />
                <span>Risk Desk</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <Menu iconShape="circle">
                <MenuItem icon={<FiGrid />} onClick={() => setActiveModal("customers")}>
                  Customer Registry
                </MenuItem>
                <MenuItem icon={<FiPlusSquare />} onClick={() => setActiveModal("intake")}>
                  New Intake
                </MenuItem>
                <MenuItem icon={<FiUsers />} onClick={() => setActiveModal("users")}>
                  User Management
                </MenuItem>
              </Menu>
            </SidebarContent>
            <SidebarFooter>
              <button className="sidebar-logout" onClick={handleLogout} type="button">
                <FiLogOut />
                Logout
              </button>
            </SidebarFooter>
          </ProSidebar>
        </aside>
      ) : null}

      <main className="page">
        <header className="topbar">
          <div className="brand">
            <p className="badge">Philippine Telco Ops</p>
            <h1>Customer Attrition System</h1>
            <p className="subtitle">
              Operational command center for churn risk, retention actions, and portfolio
              visibility across Philippine telco services.
            </p>
          </div>
        </header>

        {!token ? (
          <section className="guest-panel">
            <div className="panel">
              <div className="panel-header">
                <h2>Welcome</h2>
                <p>
                  This console is restricted. Sign in to access customer workflows,
                  risk scoring, and portfolio management for Philippine telco accounts.
                </p>
              </div>
              <button className="primary" onClick={() => setActiveModal("login")}>
                Sign In
              </button>
            </div>
          </section>
        ) : (
          <>
          <section className="summary-grid">
            <div className="summary-card">
              <p className="label">Model</p>
              <p className="value">Logistic Regression</p>
              <p className="meta">Balanced classes - 20% holdout validation</p>
            </div>
            <div className="summary-card">
              <p className="label">Portfolio</p>
              <p className="value">{customers.length}</p>
              <p className="meta">Subscribers tracked</p>
            </div>
            <div className="summary-card">
              <p className="label">Session</p>
              <p className="value">{token ? "Authenticated" : "Guest"}</p>
              <p className="meta">Access control status</p>
            </div>
            <div className="summary-card">
              <p className="label">Latest Risk</p>
              <p className="value">{result ? result.risk_level : "-"}</p>
              <p className="meta">Most recent score</p>
            </div>
          </section>

          <section className="panel insights">
            <div className="panel-header">
              <h2>Telco Insights (Philippines)</h2>
              <p>Portfolio health snapshots based on current subscriber registry.</p>
            </div>
            {loadingInsights || !insights ? (
              <p>Loading insights...</p>
            ) : (
              <div className="insight-grid">
                <div className="insight-card">
                  <p className="label">ARPU</p>
                  <p className="value">PHP {insights.avg_monthly_charges}</p>
                  <p className="meta">Average monthly charges</p>
                </div>
                <div className="insight-card">
                  <p className="label">Avg Tenure</p>
                  <p className="value">{insights.avg_tenure} mo</p>
                  <p className="meta">Customer lifespan</p>
                </div>
                <div className="insight-card">
                  <p className="label">High Risk Rate</p>
                  <p className="value">{formatPercent(insights.high_risk_rate)}</p>
                  <p className="meta">Based on scored customers</p>
                </div>
                <div className="insight-list">
                  <p className="label">Contract Mix</p>
                  {insights.contract_mix.map((b) => (
                    <div className="list-row" key={`contract-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Internet Service</p>
                  {insights.internet_mix.map((b) => (
                    <div className="list-row" key={`internet-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Tenure Buckets</p>
                  {insights.tenure_buckets.map((b) => (
                    <div className="list-row" key={`tenure-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Risk Breakdown</p>
                  {insights.risk_breakdown.map((b) => (
                    <div className="list-row" key={`risk-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Region Mix</p>
                  {insights.region_mix.map((b) => (
                    <div className="list-row" key={`region-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Province Mix</p>
                  {insights.province_mix.map((b) => (
                    <div className="list-row" key={`province-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">City Mix</p>
                  {insights.city_mix.map((b) => (
                    <div className="list-row" key={`city-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Service Mix</p>
                  {insights.service_mix.map((b) => (
                    <div className="list-row" key={`service-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Plan Mix</p>
                  {insights.plan_mix.map((b) => (
                    <div className="list-row" key={`plan-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-map">
                  <p className="label">Geography Map</p>
                  <div className="map-canvas">
                    <Map
                      center={[121.774, 12.8797]}
                      zoom={4.2}
                      pitch={0}
                      bearing={0}
                      attributionControl={false}
                      className="map-surface"
                    >
                      <MapControls position="top-right" showLocate={false} />
                      {insights.region_mix
                        .slice()
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 8)
                        .map((region) => {
                          const coords = regionCoordinatesByName[region.label];
                          if (!coords) return null;
                          return (
                            <MapMarker
                              key={`map-${region.label}`}
                              longitude={coords[0]}
                              latitude={coords[1]}
                            >
                              <MarkerContent className="marker-wrap">
                                <div className="marker-dot" />
                              </MarkerContent>
                              <MarkerLabel className="marker-label">
                                {region.label}
                              </MarkerLabel>
                              <MarkerTooltip className="marker-tooltip">
                                {region.label}: {region.count}
                              </MarkerTooltip>
                            </MapMarker>
                          );
                        })}
                    </Map>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="grid">
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
                  <div className="empty-metrics">
                    <div>
                      <p className="label">Prediction</p>
                      <p className="value">-</p>
                    </div>
                    <div>
                      <p className="label">Probability</p>
                      <p className="value">-</p>
                    </div>
                    <div>
                      <p className="label">Risk Band</p>
                      <p className="value">-</p>
                    </div>
                  </div>
                </div>
              )}
            </aside>
            <div className="panel">
              <div className="panel-header">
                <h2>Workspace Guidance</h2>
                <p>Use the sidebar to switch between workflows.</p>
              </div>
              <ul className="guidance">
                <li>Login to unlock customer and user workflows.</li>
                <li>Customer Intake creates profiles and triggers a score.</li>
                <li>User Management is restricted to admins.</li>
                <li>Customer Registry is the portfolio view.</li>
              </ul>
            </div>
          </section>
          </>
        )}
      </main>

      {activeModal ? (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {activeModal === "login"
                  ? "Access Control"
                  : activeModal === "users"
                    ? "User Management"
                    : activeModal === "customers"
                      ? "Customer Registry"
                      : "Customer Intake"}
              </h3>
              <button className="secondary" onClick={() => setActiveModal(null)}>
                Close
              </button>
            </div>

            {activeModal === "login" ? (
              <div className="modal-body login-modal">
                <div className="login-grid">
                  <div className="login-hero">
                    <p className="label">Secure Access</p>
                    <h4>Sign in to continue</h4>
                    <p className="meta">
                      Use your enterprise credentials to access customer workflows
                      and risk operations.
                    </p>
                    <div className="login-badge">Session Protected</div>
                  </div>
                  <form className="login-form" onSubmit={handleLogin}>
                    <label>
                      Username
                      <input
                        placeholder="admin"
                        value={loginForm.username}
                        onChange={handleLoginChange("username")}
                      />
                    </label>
                    <label>
                      Password
                      <input
                        type="password"
                        placeholder="********"
                        value={loginForm.password}
                        onChange={handleLoginChange("password")}
                      />
                    </label>
                    <button className="primary" type="submit" disabled={loading}>
                      {loading ? "Signing in..." : "Login"}
                    </button>
                  </form>
                </div>
                {error ? <p className="error">{error}</p> : null}
              </div>
            ) : null}

            {activeModal === "users" ? (
              <div className="modal-body">
                {token ? (
                  <>
                    <form className="auth-row" onSubmit={handleCreateUser}>
                      <input
                        placeholder="Username"
                        value={userForm.username}
                        onChange={handleUserChange("username")}
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={userForm.password}
                        onChange={handleUserChange("password")}
                      />
                      <select
                        value={userForm.is_admin}
                        onChange={handleUserChange("is_admin")}
                      >
                        <option value={0}>Standard</option>
                        <option value={1}>Admin</option>
                      </select>
                      <button className="secondary" type="submit">
                        Create User
                      </button>
                    </form>
                    <div className="table">
                      <div className="table-head">
                        <span>ID</span>
                        <span>Username</span>
                        <span>Admin</span>
                        <span>Created</span>
                        <span></span>
                        <span></span>
                      </div>
                      {users.length === 0 ? (
                        <div className="table-row empty">
                          <span>No users loaded.</span>
                        </div>
                      ) : (
                        users.map((u) => (
                          <div className="table-row" key={u.id}>
                            <span>#{u.id}</span>
                            <span>{u.username}</span>
                            <span>{u.is_admin ? "Yes" : "No"}</span>
                            <span>
                              {u.created_at ? new Date(u.created_at).toLocaleString() : "-"}
                            </span>
                            <span></span>
                            <span></span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <p>Login required.</p>
                )}
              </div>
            ) : null}

            {activeModal === "customers" ? (
              <div className="modal-body">
                {loadingCustomers ? (
                  <p>Loading customers...</p>
                ) : (
                  <div className="table">
                    <div className="table-head">
                      <span>ID</span>
                      <span>Region</span>
                      <span>City</span>
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
                          <span>{c.region || "Unassigned"}</span>
                          <span>{c.city || "-"}</span>
                          <span>{c.status || "Active"}</span>
                          <span>{c.risk_level || "-"}</span>
                          <span>
                            {typeof c.churn_probability === "number"
                              ? formatPercent(c.churn_probability)
                              : "-"}
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
              </div>
            ) : null}

            {activeModal === "intake" ? (
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="field">
                      <label>Region</label>
                      <select value={form.region} onChange={handleRegionChange}>
                        {regionOptions.map((opt) => (
                          <option key={opt.code}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Province</label>
                      <select value={form.province} onChange={handleProvinceChange}>
                        <option value="">Select province</option>
                        {provinceOptions.map((opt) => (
                          <option key={opt.code}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>City</label>
                      <select value={form.city} onChange={handleCityChange}>
                        <option value="">Select city/municipality</option>
                        {cityOptions.map((opt) => (
                          <option key={opt.code}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Barangay</label>
                      <input
                        value={form.barangay}
                        onChange={handleChange("barangay")}
                        placeholder="United Bayanihan"
                      />
                    </div>
                    <div className="field">
                      <label>Service Type</label>
                      <select value={form.service_type} onChange={handleChange("service_type")}>
                        {selectOptions.service_type.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Plan Type</label>
                      <select value={form.plan_type} onChange={handleChange("plan_type")}>
                        {selectOptions.plan_type.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
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
                </form>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
