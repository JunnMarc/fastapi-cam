import { useMemo, useState, useEffect, useRef } from "react";
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
  MapClusterLayer,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerTooltip
} from "@/components/ui/map";
import regionsData from "@/data/psgc/regions.json";
import provincesData from "@/data/psgc/provinces.json";
import citiesData from "@/data/psgc/cities.json";
import cityCentroids from "@/data/geo/city_centroids.json";
import {
  FiUsers,
  FiUser,
  FiGrid,
  FiPlusSquare,
  FiLogOut,
  FiShield,
  FiClipboard
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

function topBuckets(list, limit) {
  return list ? [...list].sort((a, b) => b.count - a.count).slice(0, limit) : [];
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
  const [activePage, setActivePage] = useState("dashboard");
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [mapFilter, setMapFilter] = useState("regions");
  const [retentionCases, setRetentionCases] = useState([]);
  const [loadingRetention, setLoadingRetention] = useState(false);
  const [retentionForm, setRetentionForm] = useState({
    customer_id: "",
    status: "New",
    owner: "",
    priority: "Medium",
    next_action_date: ""
  });
  const [noteDrafts, setNoteDrafts] = useState({});
  const [activeCaseNotes, setActiveCaseNotes] = useState([]);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const modalRef = useRef(null);
  const lastFocusRef = useRef(null);
  const [registryPage, setRegistryPage] = useState(1);
  const [registryPageSize, setRegistryPageSize] = useState(25);

  const modalTitle = useMemo(() => {
    if (activeModal === "login") return "Access Control";
    if (activeModal === "users") return "User Management";
    if (activeModal === "customers") return "Customer Registry";
    if (activeModal === "retention") return "Retention Workflow";
    if (activeModal === "intake") return "Customer Intake";
    return "";
  }, [activeModal]);

  useEffect(() => {
    if (!activeModal) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    lastFocusRef.current = document.activeElement;
    const focusable = modalEl.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first && typeof first.focus === "function") {
      first.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveModal(null);
        return;
      }
      if (event.key !== "Tab") return;
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (lastFocusRef.current && typeof lastFocusRef.current.focus === "function") {
        lastFocusRef.current.focus();
      }
    };
  }, [activeModal]);

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
  const cityCoordinatesByName = useMemo(() => {
    const map = {};
    for (const item of cityCentroids) {
      map[item.name] = [item.lon, item.lat];
    }
    return map;
  }, []);
  const loadCustomers = async (limit = 50, offset = 0) => {
    if (!token) return;
    setLoadingCustomers(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/customers?limit=${limit}&offset=${offset}`,
        {
          headers: authHeaders
        }
      );
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
    loadRetentionCases();
  }, [token]);

  useEffect(() => {
    setRegistryPage(1);
  }, [registryPageSize]);

  useEffect(() => {
    if (!token || activePage !== "registry") return;
    const offset = (registryPage - 1) * registryPageSize;
    loadCustomers(registryPageSize, offset);
  }, [token, activePage, registryPage, registryPageSize]);

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
      if (typeof payload.total_customers === "number") {
        setTotalCustomers(payload.total_customers);
      }
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

  const loadRetentionCases = async () => {
    if (!token) return;
    setLoadingRetention(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/retention-cases`, {
        headers: authHeaders
      });
      if (!response.ok) return;
      const payload = await response.json();
      setRetentionCases(payload);
    } catch {
      // ignore
    } finally {
      setLoadingRetention(false);
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
    setActivePage("dashboard");
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
      if (activePage === "registry") {
        const offset = (registryPage - 1) * registryPageSize;
        await loadCustomers(registryPageSize, offset);
      } else {
        await loadCustomers();
      }
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
      if (activePage === "registry") {
        const offset = (registryPage - 1) * registryPageSize;
        await loadCustomers(registryPageSize, offset);
      } else {
        await loadCustomers();
      }
      await loadInsights();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetentionChange = (field) => (event) => {
    const value = event.target.value;
    setRetentionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateRetentionCase = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        ...retentionForm,
        customer_id: Number(retentionForm.customer_id),
        next_action_date: retentionForm.next_action_date
          ? new Date(retentionForm.next_action_date).toISOString()
          : null
      };
      const response = await fetch(`${API_BASE}/api/v1/retention-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Retention case creation failed");
      }
      setRetentionForm({
        customer_id: "",
        status: "New",
        owner: "",
        priority: "Medium",
        next_action_date: ""
      });
      await loadRetentionCases();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateCase = async (caseId, patch) => {
    try {
      await fetch(`${API_BASE}/api/v1/retention-cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(patch)
      });
      await loadRetentionCases();
    } catch {
      // ignore
    }
  };

  const loadNotes = async (caseId) => {
    setActiveCaseId(caseId);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/retention-cases/${caseId}/notes`,
        { headers: authHeaders }
      );
      if (!response.ok) return;
      const payload = await response.json();
      setActiveCaseNotes(payload);
    } catch {
      // ignore
    }
  };

  const handleNoteChange = (caseId) => (event) => {
    const value = event.target.value;
    setNoteDrafts((prev) => ({ ...prev, [caseId]: value }));
  };

  const handleAddNote = async (caseId) => {
    const note = noteDrafts[caseId];
    if (!note) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/retention-cases/${caseId}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ note })
        }
      );
      if (!response.ok) return;
      setNoteDrafts((prev) => ({ ...prev, [caseId]: "" }));
      await loadNotes(caseId);
    } catch {
      // ignore
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
      if (activePage === "registry") {
        const offset = (registryPage - 1) * registryPageSize;
        await loadCustomers(registryPageSize, offset);
      } else {
        await loadCustomers();
      }
      await loadInsights();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalRegistryPages = Math.max(
    1,
    Math.ceil((totalCustomers || customers.length) / registryPageSize)
  );

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
                <MenuItem
                  icon={<FiGrid />}
                  active={activePage === "dashboard"}
                  onClick={() => setActivePage("dashboard")}
                >
                  Dashboard
                </MenuItem>
                <MenuItem
                  icon={<FiUsers />}
                  active={activePage === "registry"}
                  onClick={() => setActivePage("registry")}
                >
                  Customer Registry
                </MenuItem>
                <MenuItem icon={<FiPlusSquare />} onClick={() => setActiveModal("intake")}>
                  New Intake
                </MenuItem>
                <MenuItem icon={<FiClipboard />} onClick={() => setActiveModal("retention")}>
                  Retention Workflow
                </MenuItem>
                <MenuItem icon={<FiUser />} onClick={() => setActiveModal("users")}>
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
            <h1>Customer Churn System</h1>
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
              <button
                className="primary"
                onClick={() => setActiveModal("login")}
                type="button"
              >
                Sign In
              </button>
            </div>
          </section>
        ) : (
          <>
          {activePage === "dashboard" ? (
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
                  <p role="status" aria-live="polite">
                    Loading insights...
                  </p>
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
                  {topBuckets(insights.region_mix, 10).map((b) => (
                    <div className="list-row" key={`region-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Province Mix</p>
                  {topBuckets(insights.province_mix, 10).map((b) => (
                    <div className="list-row" key={`province-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">City Mix</p>
                  {topBuckets(insights.city_mix, 12).map((b) => (
                    <div className="list-row" key={`city-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Service Mix</p>
                  {topBuckets(insights.service_mix, 8).map((b) => (
                    <div className="list-row" key={`service-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Plan Mix</p>
                  {topBuckets(insights.plan_mix, 8).map((b) => (
                    <div className="list-row" key={`plan-${b.label}`}>
                      <span>{b.label}</span>
                      <span>{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-list">
                  <p className="label">Top Regions by High Risk</p>
                  {insights.region_high_risk
                    .filter((b) => b.count > 0)
                    .slice(0, 5)
                    .map((b) => (
                      <div className="list-row" key={`high-region-${b.label}`}>
                        <span>{b.label}</span>
                        <span>
                          {b.count} ({formatPercent(b.rate)})
                        </span>
                      </div>
                    ))}
                </div>
                <div className="insight-list">
                  <p className="label">Top Cities by High Risk</p>
                  {insights.city_high_risk
                    .filter((b) => b.count > 0)
                    .slice(0, 5)
                    .map((b) => (
                      <div className="list-row" key={`high-city-${b.label}`}>
                        <span>{b.label}</span>
                        <span>
                          {b.count} ({formatPercent(b.rate)})
                        </span>
                      </div>
                    ))}
                </div>
                <div className="insight-map">
                  <div className="map-header">
                    <p className="label">Geography Map</p>
                    <div className="map-filters">
                      <button
                        className={mapFilter === "regions" ? "chip active" : "chip"}
                        onClick={() => setMapFilter("regions")}
                        type="button"
                        aria-pressed={mapFilter === "regions"}
                      >
                        Regions
                      </button>
                      <button
                        className={mapFilter === "regions_high" ? "chip active" : "chip"}
                        onClick={() => setMapFilter("regions_high")}
                        type="button"
                        aria-pressed={mapFilter === "regions_high"}
                      >
                        High Risk Regions
                      </button>
                      <button
                        className={mapFilter === "cities_high" ? "chip active" : "chip"}
                        onClick={() => setMapFilter("cities_high")}
                        type="button"
                        aria-pressed={mapFilter === "cities_high"}
                      >
                        High Risk Cities
                      </button>
                    </div>
                  </div>
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
                      {mapFilter === "cities_high" ? (
                        <MapClusterLayer
                          data={{
                            type: "FeatureCollection",
                            features: insights.city_high_risk
                              .filter((c) => c.count > 0)
                              .map((item) => {
                                const coords = cityCoordinatesByName[item.label];
                                if (!coords) return null;
                                return {
                                  type: "Feature",
                                  properties: {
                                    label: item.label,
                                    count: item.count,
                                    rate: item.rate
                                  },
                                  geometry: {
                                    type: "Point",
                                    coordinates: coords
                                  }
                                };
                              })
                              .filter(Boolean)
                          }}
                          clusterColors={["#0b5cab", "#f59e0b", "#b91c1c"]}
                          pointColor="#b91c1c"
                        />
                      ) : (
                        (mapFilter === "regions_high"
                          ? insights.region_high_risk
                          : insights.region_mix
                        )
                          .filter(
                            (item) =>
                              mapFilter === "regions" || (item.count ?? 0) > 0
                          )
                          .slice()
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 8)
                          .map((item) => {
                            const coords = regionCoordinatesByName[item.label];
                            if (!coords) return null;
                            const isHigh = mapFilter !== "regions";
                            return (
                              <MapMarker
                                key={`map-${item.label}`}
                                longitude={coords[0]}
                                latitude={coords[1]}
                              >
                                <MarkerContent className="marker-wrap">
                                  <div className={isHigh ? "marker-dot high" : "marker-dot"} />
                                </MarkerContent>
                                <MarkerLabel className="marker-label">
                                  {item.label}
                                </MarkerLabel>
                                <MarkerTooltip className="marker-tooltip">
                                  {item.label}: {item.count}
                                  {typeof item.rate === "number"
                                    ? ` (${formatPercent(item.rate)})`
                                    : ""}
                                </MarkerTooltip>
                              </MapMarker>
                            );
                          })
                      )}
                    </Map>
                  </div>
                  <div className="map-legend">
                    <span
                      className={
                        mapFilter === "regions" ? "legend-dot" : "legend-dot high"
                      }
                    />
                    <span className="legend-text">
                      {mapFilter === "regions"
                        ? "Total subscribers"
                        : "High-risk subscribers"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>
          <section className="panel">
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
          </section>
          </>
          ) : null}

          {activePage === "registry" ? (
          <>
          <section className="panel registry-header">
            <div className="panel-header">
              <h2>Customer Registry</h2>
              <p>Portfolio view with on-demand scoring and risk explanations.</p>
            </div>
            <div className="registry-actions">
              <div className="registry-meta">
                <span className="label">Total Records</span>
                <span className="value">
                  {totalCustomers || customers.length}
                </span>
              </div>
              <div className="registry-controls">
                <label className="registry-select">
                  Rows
                  <select
                    value={registryPageSize}
                    onChange={(event) => setRegistryPageSize(Number(event.target.value))}
                    aria-label="Rows per page"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    const offset = (registryPage - 1) * registryPageSize;
                    loadCustomers(registryPageSize, offset);
                  }}
                  disabled={loadingCustomers}
                >
                  Refresh
                </button>
              </div>
            </div>
          </section>
          <section className="registry-layout">
            <div className="panel registry-table">
              <div className="panel-header">
                <h2>Registry Table</h2>
                <p>Score customers to refresh risk drivers and probability.</p>
              </div>
              {loadingCustomers ? (
                <p role="status" aria-live="polite">
                  Loading customers...
                </p>
              ) : (
                <>
                  <div className="table" role="table" aria-label="Customers">
                    <div className="table-head" role="row">
                      <span role="columnheader">ID</span>
                      <span role="columnheader">Region</span>
                      <span role="columnheader">City</span>
                      <span role="columnheader">Status</span>
                      <span role="columnheader">Risk</span>
                      <span role="columnheader">Probability</span>
                      <span role="columnheader">Actions</span>
                    </div>
                    {customers.length === 0 ? (
                      <div className="table-row empty" role="row">
                        <span role="cell">No customers yet.</span>
                      </div>
                    ) : (
                      customers.map((c) => (
                        <div className="table-row" role="row" key={c.id}>
                          <span role="cell">#{c.id}</span>
                          <span role="cell">{c.region || "Unassigned"}</span>
                          <span role="cell">{c.city || "-"}</span>
                          <span role="cell">{c.status || "Active"}</span>
                          <span role="cell">{c.risk_level || "-"}</span>
                          <span role="cell">
                            {typeof c.churn_probability === "number"
                              ? formatPercent(c.churn_probability)
                              : "-"}
                          </span>
                          <span role="cell">
                            <button
                              className="secondary"
                              onClick={() => handleScore(c.id)}
                              disabled={loading}
                              type="button"
                            >
                              Score
                            </button>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  {customers.length > 0 ? (
                    <div className="pagination">
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => setRegistryPage(1)}
                        disabled={registryPage === 1}
                      >
                        First
                      </button>
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => setRegistryPage((p) => Math.max(1, p - 1))}
                        disabled={registryPage === 1}
                      >
                        Prev
                      </button>
                      <span className="pagination-meta">
                        Page {registryPage} of {totalRegistryPages}
                      </span>
                      <button
                        className="ghost"
                        type="button"
                        onClick={() =>
                          setRegistryPage((p) => Math.min(totalRegistryPages, p + 1))
                        }
                        disabled={registryPage === totalRegistryPages}
                      >
                        Next
                      </button>
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => setRegistryPage(totalRegistryPages)}
                        disabled={registryPage === totalRegistryPages}
                      >
                        Last
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <aside className={`panel result registry-risk ${riskTone}`}>
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
                  {result.drivers?.length ? (
                    <div>
                      <p className="label">Top Risk Drivers</p>
                      <ul className="pill-list" aria-label="Top risk drivers">
                        {result.drivers.map((driver) => (
                          <li className="pill" key={`driver-${driver}`}>
                            {driver}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {result.protectors?.length ? (
                    <div>
                      <p className="label">Protective Factors</p>
                      <ul className="pill-list" aria-label="Protective factors">
                        {result.protectors.map((protector) => (
                          <li className="pill" key={`protector-${protector}`}>
                            {protector}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="result-empty">
                  <p>Score a customer to see the churn risk explanation.</p>
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
          </section>
          </>
          ) : null}
          </>
        )}
      </main>

      {activeModal ? (
        <div
          className="modal-backdrop"
          onClick={() => setActiveModal(null)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`modal-title-${activeModal}`}
            ref={modalRef}
          >
            <div className="modal-header">
              <h3 id={`modal-title-${activeModal}`}>{modalTitle}</h3>
              <button
                className="secondary"
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close dialog"
              >
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
                        aria-label="Username"
                        placeholder="admin"
                        value={loginForm.username}
                        onChange={handleLoginChange("username")}
                      />
                    </label>
                    <label>
                      Password
                      <input
                        aria-label="Password"
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
                {error ? (
                  <p className="error" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : null}

            {activeModal === "users" ? (
              <div className="modal-body">
                {token ? (
                  <>
                    <form className="auth-row" onSubmit={handleCreateUser}>
                      <input
                        aria-label="Username"
                        placeholder="Username"
                        value={userForm.username}
                        onChange={handleUserChange("username")}
                      />
                      <input
                        aria-label="Password"
                        type="password"
                        placeholder="Password"
                        value={userForm.password}
                        onChange={handleUserChange("password")}
                      />
                      <select
                        aria-label="Admin role"
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
                    <div className="table" role="table" aria-label="Users">
                      <div className="table-head" role="row">
                        <span role="columnheader">ID</span>
                        <span role="columnheader">Username</span>
                        <span role="columnheader">Admin</span>
                        <span role="columnheader">Created</span>
                        <span role="columnheader" aria-hidden="true"></span>
                        <span role="columnheader" aria-hidden="true"></span>
                      </div>
                      {users.length === 0 ? (
                        <div className="table-row empty" role="row">
                          <span role="cell">No users loaded.</span>
                        </div>
                      ) : (
                        users.map((u) => (
                          <div className="table-row" role="row" key={u.id}>
                            <span role="cell">#{u.id}</span>
                            <span role="cell">{u.username}</span>
                            <span role="cell">{u.is_admin ? "Yes" : "No"}</span>
                            <span role="cell">
                              {u.created_at ? new Date(u.created_at).toLocaleString() : "-"}
                            </span>
                            <span role="cell"></span>
                            <span role="cell"></span>
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

            {activeModal === "retention" ? (
              <div className="modal-body">
                {token ? (
                  <>
                    <form className="retention-form" onSubmit={handleCreateRetentionCase}>
                      <select
                        aria-label="Customer"
                        value={retentionForm.customer_id}
                        onChange={handleRetentionChange("customer_id")}
                        required
                      >
                        <option value="">Select customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            #{c.id} - {c.region || "Region"} / {c.city || "City"}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Case status"
                        value={retentionForm.status}
                        onChange={handleRetentionChange("status")}
                      >
                        <option value="New">New</option>
                        <option value="In Review">In Review</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                      <select
                        aria-label="Case priority"
                        value={retentionForm.priority}
                        onChange={handleRetentionChange("priority")}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                      <input
                        aria-label="Case owner"
                        placeholder="Owner"
                        value={retentionForm.owner}
                        onChange={handleRetentionChange("owner")}
                      />
                      <input
                        aria-label="Next action date"
                        type="date"
                        value={retentionForm.next_action_date}
                        onChange={handleRetentionChange("next_action_date")}
                      />
                      <button className="secondary" type="submit">
                        Create Case
                      </button>
                    </form>

                    {loadingRetention ? (
                      <p>Loading cases...</p>
                    ) : (
                      <div className="retention-list">
                        {retentionCases.length === 0 ? (
                          <p>No retention cases yet.</p>
                        ) : (
                          retentionCases.map((rc) => (
                            <div className="retention-item" key={rc.id}>
                              <div className="retention-header">
                                <div>
                                  <p className="label">Case #{rc.id}</p>
                                  <p className="value">Customer {rc.customer_id}</p>
                                </div>
                                <div className="retention-actions">
                                  <select
                                    value={rc.status}
                                    onChange={(e) =>
                                      handleUpdateCase(rc.id, { status: e.target.value })
                                    }
                                  >
                                    <option value="New">New</option>
                                    <option value="In Review">In Review</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Resolved">Resolved</option>
                                  </select>
                                  <select
                                    value={rc.priority}
                                    onChange={(e) =>
                                      handleUpdateCase(rc.id, { priority: e.target.value })
                                    }
                                  >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                  </select>
                                  <button
                                    className="ghost"
                                    type="button"
                                    onClick={() => loadNotes(rc.id)}
                                  >
                                    Notes
                                  </button>
                                </div>
                              </div>
                              <div className="retention-meta">
                                <span>Owner: {rc.owner || "Unassigned"}</span>
                                <span>
                                  Next Action:{" "}
                                  {rc.next_action_date
                                    ? new Date(rc.next_action_date).toLocaleDateString()
                                    : "-"}
                                </span>
                              </div>
                              {activeCaseId === rc.id ? (
                                <div className="retention-notes">
                                  <div className="note-input">
                                    <input
                                      aria-label="Add note"
                                      placeholder="Add note"
                                      value={noteDrafts[rc.id] || ""}
                                      onChange={handleNoteChange(rc.id)}
                                    />
                                    <button
                                      className="secondary"
                                      type="button"
                                      onClick={() => handleAddNote(rc.id)}
                                    >
                                      Add
                                    </button>
                                  </div>
                                  <div className="note-list">
                                    {activeCaseNotes.map((note) => (
                                      <div className="note-item" key={note.id}>
                                        <span>{note.note}</span>
                                        <span className="note-time">
                                          {note.created_at
                                            ? new Date(note.created_at).toLocaleString()
                                            : ""}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p>Login required.</p>
                )}
              </div>
            ) : null}

            {activeModal === "intake" ? (
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="intake-region">Region</label>
                      <select
                        id="intake-region"
                        value={form.region}
                        onChange={handleRegionChange}
                      >
                        {regionOptions.map((opt) => (
                          <option key={opt.code}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="intake-province">Province</label>
                      <select
                        id="intake-province"
                        value={form.province}
                        onChange={handleProvinceChange}
                      >
                        <option value="">Select province</option>
                        {provinceOptions.map((opt) => (
                          <option key={opt.code}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="intake-city">City</label>
                      <select id="intake-city" value={form.city} onChange={handleCityChange}>
                        <option value="">Select city/municipality</option>
                        {cityOptions.map((opt) => (
                          <option key={opt.code}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="intake-barangay">Barangay</label>
                      <input
                        id="intake-barangay"
                        value={form.barangay}
                        onChange={handleChange("barangay")}
                        placeholder="United Bayanihan"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="intake-service-type">Service Type</label>
                      <select
                        id="intake-service-type"
                        value={form.service_type}
                        onChange={handleChange("service_type")}
                      >
                        {selectOptions.service_type.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="intake-plan-type">Plan Type</label>
                      <select
                        id="intake-plan-type"
                        value={form.plan_type}
                        onChange={handleChange("plan_type")}
                      >
                        {selectOptions.plan_type.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="intake-gender">Gender</label>
                      <select id="intake-gender" value={form.gender} onChange={handleChange("gender")}>
                        {selectOptions.gender.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="intake-senior">Senior Citizen</label>
                      <select
                        id="intake-senior"
                        value={form.SeniorCitizen}
                        onChange={handleChange("SeniorCitizen")}
                      >
                        <option value={0}>0 - No</option>
                        <option value={1}>1 - Yes</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="intake-partner">Partner</label>
                      <select
                        id="intake-partner"
                        value={form.Partner}
                        onChange={handleChange("Partner")}
                      >
                        {selectOptions.Partner.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="intake-dependents">Dependents</label>
                      <select
                        id="intake-dependents"
                        value={form.Dependents}
                        onChange={handleChange("Dependents")}
                      >
                        {selectOptions.Dependents.map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="intake-tenure">Tenure (months)</label>
                      <input
                        id="intake-tenure"
                        type="number"
                        min="0"
                        value={form.tenure}
                        onChange={handleChange("tenure")}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="intake-monthly">Monthly Charges</label>
                      <input
                        id="intake-monthly"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.MonthlyCharges}
                        onChange={handleChange("MonthlyCharges")}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="intake-total">Total Charges</label>
                      <input
                        id="intake-total"
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
                    ].map((field) => {
                      const fieldId = `intake-${field}`;
                      return (
                        <div className="field" key={field}>
                          <label htmlFor={fieldId}>{field}</label>
                          <select id={fieldId} value={form[field]} onChange={handleChange(field)}>
                          {selectOptions[field].map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                          </select>
                        </div>
                      );
                    })}
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
