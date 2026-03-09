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
  const { authHeaders, API_BASE, loadCustomers, loadInsights, setResult, setActivePage, setActiveModal, addToast } = useAppContext();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;

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

  const nextStep = () => {
    if (step === 1 && (!form.region || !form.province || !form.city)) {
      addToast("Please complete location details", "error");
      return;
    }
    if (step === 2 && form.tenure < 0) {
      addToast("Tenure cannot be negative", "error");
      return;
    }
    setStep((p) => Math.min(p + 1, totalSteps));
  };

  const prevStep = () => {
    setStep((p) => Math.max(p - 1, 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
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
      addToast("Customer registered and scored successfully", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicators = () => (
    <div className="wizard-steps" role="tablist" aria-label="Intake steps">
      {["Location", "Demographics", "Services", "Billing"].map((label, idx) => {
        const s = idx + 1;
        return (
          <div
            key={label}
            role="tab"
            aria-selected={step === s}
            aria-controls={`step-panel-${s}`}
            className={`wizard-step ${step === s ? "active" : ""} ${step > s ? "completed" : ""}`}
          >
            <div className="wizard-step-circle">{s}</div>
            <span className="wizard-step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="modal-body wizard">
      {renderStepIndicators()}
      
      <form onSubmit={handleSubmit}>
        <div 
          className="wizard-panel" 
          id={`step-panel-${step}`} 
          role="tabpanel" 
          aria-labelledby={`step-${step}`}
        >
          {step === 1 && (
            <div className="form-grid" aria-live="polite">
              <div className="field full">
                <h5>Step 1: Location Data</h5>
                <p className="meta">Customer's primary service address.</p>
              </div>
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
            </div>
          )}

          {step === 3 && (
            <div className="form-grid" aria-live="polite">
              <div className="field full">
                <h5>Step 3: Service Configuration</h5>
                <p className="meta">Active lines and internet features.</p>
              </div>
              <div className="field">
                <label htmlFor="intake-service-type">Service Type</label>
                <select id="intake-service-type" value={form.service_type} onChange={handleChange("service_type")}>
                  {selectOptions.service_type.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
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
                "StreamingMovies"
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
          )}

          {step === 4 && (
            <div className="form-grid" aria-live="polite">
              <div className="field full">
                <h5>Step 4: Billing & Contracts</h5>
                <p className="meta">Plan type, contract terms, and charges.</p>
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
                <label htmlFor="intake-monthly">Monthly Charges</label>
                <input id="intake-monthly" type="number" step="0.01" min="0" value={form.MonthlyCharges} onChange={handleChange("MonthlyCharges")} />
              </div>
              <div className="field">
                <label htmlFor="intake-total">Total Charges</label>
                <input id="intake-total" type="number" step="0.01" min="0" value={form.TotalCharges} onChange={handleChange("TotalCharges")} />
              </div>
              {[
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
          )}
        </div>

        <div className="wizard-controls">
          {step > 1 && (
            <button className="ghost" type="button" onClick={prevStep} disabled={loading}>
              Back
            </button>
          )}
          {step < totalSteps ? (
            <button className="primary" type="button" onClick={nextStep} style={{ marginLeft: "auto" }}>
              Next Step
            </button>
          ) : (
            <button className="primary" type="submit" disabled={loading} style={{ marginLeft: "auto" }}>
              {loading ? "Saving..." : "Create & Score"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
