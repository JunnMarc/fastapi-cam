import { useState, useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import regionsData from "@/data/psgc/regions.json";
import provincesData from "@/data/psgc/provinces.json";
import citiesData from "@/data/psgc/cities.json";

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

export default function IntakeModal() {
  const { authHeaders, API_BASE, loadCustomers, loadInsights, setResult, setActivePage, setActiveModal } = useAppContext();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const regionOptions = useMemo(() => regionsData.slice().sort((a, b) => a.name.localeCompare(b.name)), []);
  const selectedRegion = useMemo(() => regionOptions.find((r) => r.name === form.region), [form.region, regionOptions]);
  const provinceOptions = useMemo(() => {
    if (!selectedRegion) return [];
    return provincesData
      .filter((p) => p.region_code === selectedRegion.code)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedRegion]);
  const selectedProvince = useMemo(() => provinceOptions.find((p) => p.name === form.province), [form.province, provinceOptions]);
  const cityOptions = useMemo(() => {
    if (selectedProvince) {
      return citiesData
        .filter((c) => c.province_code === selectedProvince.code)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    if (selectedRegion) {
      return citiesData
        .filter((c) => c.region_code === selectedRegion.code && (c.province_code === null || c.province_code === ""))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }, [selectedRegion, selectedProvince]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === "number" ? Number(event.target.value) : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegionChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, region: value, province: "", city: "" }));
  };

  const handleProvinceChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, province: value, city: "" }));
  };

  const handleCityChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, city: value }));
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
      
      const score = await fetch(`${API_BASE}/api/v1/customers/${created.id}/score`, { 
        method: "POST", headers: authHeaders 
      });
      
      if (!score.ok) {
        const payload = await score.json();
        throw new Error(payload.detail || "Scoring failed");
      }
      
      const payload = await score.json();
      setResult(payload);
      await loadCustomers();
      await loadInsights();
      setActivePage("registry");
      setActiveModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-body">
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="intake-region">Region</label>
            <select id="intake-region" value={form.region} onChange={handleRegionChange}>
              {regionOptions.map((opt) => (
                <option key={opt.code}>{opt.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="intake-province">Province</label>
            <select id="intake-province" value={form.province} onChange={handleProvinceChange}>
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
            <select id="intake-service-type" value={form.service_type} onChange={handleChange("service_type")}>
              {selectOptions.service_type.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="intake-plan-type">Plan Type</label>
            <select id="intake-plan-type" value={form.plan_type} onChange={handleChange("plan_type")}>
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
            <select id="intake-senior" value={form.SeniorCitizen} onChange={handleChange("SeniorCitizen")}>
              <option value={0}>0 - No</option>
              <option value={1}>1 - Yes</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="intake-partner">Partner</label>
            <select id="intake-partner" value={form.Partner} onChange={handleChange("Partner")}>
              {selectOptions.Partner.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="intake-dependents">Dependents</label>
            <select id="intake-dependents" value={form.Dependents} onChange={handleChange("Dependents")}>
              {selectOptions.Dependents.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="intake-tenure">Tenure (months)</label>
            <input id="intake-tenure" type="number" min="0" value={form.tenure} onChange={handleChange("tenure")} />
          </div>
          <div className="field">
            <label htmlFor="intake-monthly">Monthly Charges</label>
            <input id="intake-monthly" type="number" step="0.01" min="0" value={form.MonthlyCharges} onChange={handleChange("MonthlyCharges")} />
          </div>
          <div className="field">
            <label htmlFor="intake-total">Total Charges</label>
            <input id="intake-total" type="number" step="0.01" min="0" value={form.TotalCharges} onChange={handleChange("TotalCharges")} />
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
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Create & Score"}
        </button>
      </form>
    </div>
  );
}
