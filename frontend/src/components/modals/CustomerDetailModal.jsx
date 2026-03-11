import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";

function formatPercent(value) {
  if (value === null || value === undefined) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(isoString) {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "0.00";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function CustomerDetailModal() {
  const { activeCustomerContext, setActiveModal, token, authHeaders, API_BASE } = useAppContext();
  const [customer, setCustomer] = useState(null);
  const [retentionCases, setRetentionCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCustomerContext || !token) return;

    async function loadData() {
      setLoading(true);
      try {
        const custRes = await fetch(`${API_BASE}/api/v1/customers/${activeCustomerContext.id}`, {
          headers: authHeaders
        });
        if (custRes.ok) {
          setCustomer(await custRes.json());
        }

        const casesRes = await fetch(`${API_BASE}/api/v1/retention-cases?customer_id=${activeCustomerContext.id}&limit=50`, {
          headers: authHeaders
        });
        if (casesRes.ok) {
          setRetentionCases(await casesRes.json());
        }
      } catch (err) {
        // Handle error silently here, let skeleton show or handle gracefully
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeCustomerContext, token, authHeaders, API_BASE]);

  if (!activeCustomerContext) return null;

  return (
    <div className="modal-body" style={{ display: 'grid', gap: '24px' }}>
      {loading ? (
        <p>Loading customer profile...</p>
      ) : !customer ? (
        <p className="error">Failed to load customer details.</p>
      ) : (
        <>
            
            {/* Header / Identity info */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.4rem' }}>{customer.name || `Customer #${customer.id}`}</h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
                  {customer.email || 'No Email'} • {customer.city ? `${customer.city}, ${customer.province}` : 'No Location Provided'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge">{customer.status}</span>
                <span className="badge" style={{ background: customer.risk_level === 'High' ? '#7c2d12' : customer.risk_level === 'Medium' ? '#a16207' : '#166534' }}>
                  {customer.risk_level} Risk
                </span>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="form-grid">
              <div className="field">
                <label>Segment</label>
                <div className="value" style={{ fontSize: '1rem' }}>{customer.segment || '-'}</div>
              </div>
              <div className="field">
                <label>Tenure</label>
                <div className="value" style={{ fontSize: '1rem' }}>{customer.tenure} months</div>
              </div>
              <div className="field">
                <label>Service Type</label>
                <div className="value" style={{ fontSize: '1rem' }}>{customer.service_type || '-'}</div>
              </div>
              <div className="field">
                <label>Plan Type</label>
                <div className="value" style={{ fontSize: '1rem' }}>{customer.plan_type || '-'}</div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--outline)', margin: '0' }} />

            {/* Two Column Layout for deeper details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}>
              
              {/* Financials */}
              <div className="panel" style={{ padding: '16px', boxShadow: 'none', border: '1px solid var(--outline)' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Financials & Specs</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">Monthly Charges</span>
                    <span style={{ fontWeight: 600 }}>PHP {formatCurrency(customer.MonthlyCharges)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">Total Charges</span>
                    <span style={{ fontWeight: 600 }}>PHP {formatCurrency(customer.TotalCharges)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">Contract</span>
                    <span style={{ fontWeight: 600 }}>{customer.Contract}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">Payment</span>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{customer.PaymentMethod}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">Internet</span>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{customer.InternetService}</span>
                  </div>
                </div>
              </div>

              {/* Risk Profile */}
              <div className="panel" style={{ padding: '16px', boxShadow: 'none', border: '1px solid var(--outline)' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Risk Profile</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">Churn Probability</span>
                    <span style={{ fontWeight: 600 }}>{formatPercent(customer.churn_probability)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">Risk Level</span>
                    <span style={{ fontWeight: 600 }}>{customer.risk_level}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">Last Predicted</span>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{formatDate(customer.last_prediction_at)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Retention History Array */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '1.2rem' }}>Retention History</h4>
              {retentionCases.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>No retention cases found for this customer.</p>
              ) : (
                <div style={{ display: 'grid', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {retentionCases.map((rc) => (
                    <div key={rc.id} style={{ border: '1px solid var(--outline)', padding: '12px', borderRadius: '8px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'grid', gap: '4px' }}>
                        <span style={{ fontWeight: 600 }}>Case #{rc.id} ({rc.status})</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Priority: {rc.priority} | Owner: {rc.owner || "Unassigned"}</span>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        {formatDate(rc.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

        </>
      )}
    </div>
  );
}
