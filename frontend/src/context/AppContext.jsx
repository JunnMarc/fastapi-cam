import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const AppProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("auth_token") || "");
  const [activePage, setActivePage] = useState("dashboard");
  const [activeModal, setActiveModal] = useState(null);
  const [activeCustomerContext, setActiveCustomerContext] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  const addToast = (message, type = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  
  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  const [result, setResult] = useState(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setToken("");
    setCustomers([]);
    setInsights(null);
    setResult(null);
    setActivePage("dashboard");
  };

  const loadCustomers = async (limit = 50, offset = 0) => {
    if (!token) return;
    setLoadingCustomers(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/customers?limit=${limit}&offset=${offset}`,
        { headers: authHeaders }
      );
      if (response.ok) {
        const payload = await response.json();
        setCustomers(payload);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadInsights = async () => {
    if (!token) return;
    setLoadingInsights(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/insights`, {
        headers: authHeaders
      });
      if (response.ok) {
        const payload = await response.json();
        setInsights(payload);
        if (typeof payload.total_customers === "number") {
          setTotalCustomers(payload.total_customers);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadInsights();
    }
  }, [token]);

  return (
    <AppContext.Provider
      value={{
        token,
        setToken,
        activePage,
        setActivePage,
        activeModal,
        setActiveModal,
        activeCustomerContext,
        setActiveCustomerContext,
        customers,
        setCustomers,
        totalCustomers,
        setTotalCustomers,
        loadingCustomers,
        loadCustomers,
        insights,
        loadingInsights,
        loadInsights,
        result,
        setResult,
        handleLogout,
        authHeaders,
        API_BASE,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
