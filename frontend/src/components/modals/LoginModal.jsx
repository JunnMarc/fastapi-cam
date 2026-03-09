import { useState } from "react";
import { useAppContext } from "../../context/AppContext";

export default function LoginModal() {
  const { setToken, setActiveModal, API_BASE } = useAppContext();
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setActiveModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-body login-modal">
      <div className="login-grid">
        <div className="login-hero">
          <p className="label">Secure Access</p>
          <h4>Sign in to continue</h4>
          <p className="meta">
            Use your enterprise credentials to access customer workflows and risk operations.
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
  );
}
