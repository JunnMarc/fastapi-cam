import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function CustomerRegistry() {
  const { customers, totalCustomers, loadingCustomers, loadCustomers, result, setResult, insights, loadInsights, token, API_BASE, authHeaders, addToast } = useAppContext();
  const [registryPage, setRegistryPage] = useState(1);
  const [registryPageSize, setRegistryPageSize] = useState(25);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRegistryPage(1);
  }, [registryPageSize]);

  useEffect(() => {
    if (!token) return;
    const offset = (registryPage - 1) * registryPageSize;
    loadCustomers(registryPageSize, offset);
  }, [token, registryPage, registryPageSize]);

  const handleScore = async (id) => {
    setLoading(true);
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
      
      const offset = (registryPage - 1) * registryPageSize;
      addToast("Customer scored successfully!", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const riskTone = result
    ? result.risk_level === "High"
      ? "high"
      : result.risk_level === "Medium"
      ? "medium"
      : "low"
    : "neutral";

  const totalRegistryPages = Math.max(
    1,
    Math.ceil((totalCustomers || customers.length) / registryPageSize)
  );

  return (
    <>
      <section className="panel registry-header">
        <div className="panel-header">
          <h2>Customer Registry</h2>
          <p>Portfolio view with on-demand scoring and risk explanations.</p>
        </div>
        <div className="registry-actions">
          <div className="registry-meta">
            <span className="label">Total Records</span>
            <span className="value">{totalCustomers || customers.length}</span>
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
            <div className="table" role="table" aria-label="Loading Customers">
              <div className="table-head" role="row">
                <span role="columnheader">ID</span>
                <span role="columnheader">Region</span>
                <span role="columnheader">City</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Risk</span>
                <span role="columnheader">Probability</span>
                <span role="columnheader">Actions</span>
              </div>
              {[...Array(5)].map((_, i) => (
                <div className="skeleton skeleton-table-row" key={i}></div>
              ))}
            </div>
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
                Suggested Action:{" "}
                {result.risk_level === "High"
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
  );
}
