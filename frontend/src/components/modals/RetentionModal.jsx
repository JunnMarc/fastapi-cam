import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";

export default function RetentionModal() {
  const { customers, token, authHeaders, API_BASE, addToast } = useAppContext();
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

  useEffect(() => {
    if (token) loadRetentionCases();
  }, [token]);

  const handleRetentionChange = (field) => (event) => {
    const value = event.target.value;
    setRetentionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateRetentionCase = async (event) => {
    event.preventDefault();
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
      addToast("Retention case created successfully", "success");
    } catch (err) {
      addToast(err.message, "error");
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
      addToast("Retention case updated", "success");
    } catch (err) {
      addToast("Failed to update case", "error");
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
      addToast("Note added", "success");
    } catch (err) {
      addToast("Failed to add note", "error");
    }
  };

  return (
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
            <div className="retention-list" aria-label="Loading cases">
               {[...Array(3)].map((_, i) => (
                <div className="skeleton skeleton-card" key={i}></div>
               ))}
            </div>
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
  );
}
