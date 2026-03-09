import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";

export default function UserManagementModal() {
  const { token, authHeaders, API_BASE, addToast } = useAppContext();
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ username: "", password: "", is_admin: 0 });

  const loadUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/v1/users`, {
        headers: authHeaders
      });
      if (!response.ok) return;
      const payload = await response.json();
      setUsers(payload);
    } catch {
      // ignore
    } finally {
      // Add a slight delay if needed to simulate network, but we assume it's fast.
    }
  };

  useEffect(() => {
    if (token) loadUsers();
  }, [token]);

  const handleUserChange = (field) => (event) => {
    const value =
      event.target.type === "number"
        ? Number(event.target.value)
        : event.target.value;
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
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
      addToast("User created successfully", "success");
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  return (
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
  );
}
