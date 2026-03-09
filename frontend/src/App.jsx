import { AppProvider, useAppContext } from "./context/AppContext";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Dashboard from "./pages/Dashboard";
import CustomerRegistry from "./pages/CustomerRegistry";
import ModalWrapper from "./components/modals/ModalWrapper";
import "react-pro-sidebar/dist/css/styles.css";

function AppContent() {
  const { token, activePage, setActiveModal } = useAppContext();

  return (
    <div className={`app-shell ${token ? "authed" : "guest"}`}>
      {token ? <Sidebar /> : null}

      <main className="page">
        <Topbar />

        {!token ? (
          <section className="guest-panel">
            <div className="panel">
              <div className="panel-header">
                <h2>Welcome</h2>
                <p>
                  This console is restricted. Sign in to access customer workflows,
                  risk operations, and portfolio management.
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
            {activePage === "dashboard" && <Dashboard />}
            {activePage === "registry" && <CustomerRegistry />}
          </>
        )}
      </main>

      <ModalWrapper />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
