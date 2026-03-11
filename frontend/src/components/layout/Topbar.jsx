import { useAppContext } from "../../context/AppContext";

export default function Topbar() {
  const { apiStatus, warming, warmApi } = useAppContext();

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <p className="badge">Philippine Telco Ops</p>
          <h1>Customer Churn System</h1>
          <p className="subtitle">
            Operational command center for churn risk, retention actions, and portfolio visibility across Philippine telco services.
          </p>
        </div>
      </header>
      {apiStatus !== "ready" ? (
        <div className="status-banner" role="status" aria-live="polite">
          <span>
            {apiStatus === "warming"
              ? "Warming up server..."
              : "Backend unavailable. Retrying..."}
          </span>
          <button className="ghost" type="button" onClick={() => warmApi()}>
            Retry
          </button>
        </div>
      ) : null}
    </>
  );
}
