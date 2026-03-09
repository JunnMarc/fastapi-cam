import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";

export default function RetentionModal() {
  const { activeCustomerContext, token, authHeaders, API_BASE, addToast } = useAppContext();
  const [retentionCases, setRetentionCases] = useState([]);
  const [loadingRetention, setLoadingRetention] = useState(false);
  const [retentionPage, setRetentionPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [retentionForm, setRetentionForm] = useState({
    status: "New",
    owner: "",
    priority: "Medium",
    next_action_date: ""
  });
  const [noteDrafts, setNoteDrafts] = useState({});
  const [activeCaseNotes, setActiveCaseNotes] = useState([]);
  const [activeCaseId, setActiveCaseId] = useState(null);

  const loadRetentionCases = async (page = 1) => {
    if (!token) return;
    setLoadingRetention(true);
    try {
      const limit = 10;
      const offset = (page - 1) * limit;
      const response = await fetch(`${API_BASE}/api/v1/retention-cases?limit=${limit}&offset=${offset}`, {
        headers: authHeaders
      });
      if (!response.ok) return;
      const payload = await response.json();
      setRetentionCases(payload);
      setHasMore(payload.length === limit);
    } catch {
      // ignore
    } finally {
      setLoadingRetention(false);
    }
  };

  useEffect(() => {
    if (token) loadRetentionCases(retentionPage);
  }, [token, retentionPage]);

  const handleRetentionChange = (field) => (event) => {
    const value = event.target.value;
    setRetentionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateRetentionCase = async (event) => {
    event.preventDefault();
    if (!activeCustomerContext) return;
    try {
      const payload = {
        ...retentionForm,
        customer_id: activeCustomerContext.id,
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
        status: "New",
        owner: "",
        priority: "Medium",
        next_action_date: ""
      });
      await loadRetentionCases(retentionPage);
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
      await loadRetentionCases(retentionPage);
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
          {activeCustomerContext && (
            <div className="retention-action-header">
              <p style={{marginBottom: 16}}>Creating case for <strong>{activeCustomerContext.name || `Customer #${activeCustomerContext.id}`}</strong></p>
            </div>
          )}
          {activeCustomerContext ? (
          <form className="retention-form" onSubmit={handleCreateRetentionCase}>
            <div className="field">
              <label htmlFor="retention-status">Status</label>
              <select
                id="retention-status"
                value={retentionForm.status}
                onChange={handleRetentionChange("status")}
              >
                <option value="New">New</option>
                <option value="In Review">In Review</option>
                <option value="Contacted">Contacted</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="retention-priority">Priority</label>
              <select
                id="retention-priority"
                value={retentionForm.priority}
                onChange={handleRetentionChange("priority")}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="retention-owner">Case Owner</label>
              <input
                id="retention-owner"
                placeholder="e.g. Sarah J."
                value={retentionForm.owner}
                onChange={handleRetentionChange("owner")}
              />
            </div>
            <div className="field">
              <label htmlFor="retention-date">Next Action</label>
              <input
                id="retention-date"
                type="date"
                value={retentionForm.next_action_date}
                onChange={handleRetentionChange("next_action_date")}
              />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="primary" type="submit" style={{ width: "100%", height: "42px" }}>
                Create Case
              </button>
            </div>
          </form>
          ) : (
            <div className="retention-action-header" style={{marginBottom: 16}}>
              <p>To create a new retention case, close this modal and click "Create Case" on a direct registry row.</p>
            </div>
          )}

          {loadingRetention ? (
            <div className="retention-list" aria-label="Loading cases">
               {[...Array(3)].map((_, i) => (
                <div className="skeleton skeleton-card" key={i}></div>
               ))}
            </div>
          ) : (
            <div className="retention-list">
              {retentionCases.length === 0 ? (
                <div className="retention-item empty" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  <p style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "4px" }}>No cases found</p>
                  <p style={{ fontSize: "0.85rem" }}>Create a new case above to start tracking retention efforts.</p>
                </div>
              ) : (
                retentionCases.map((rc) => (
                  <div className="retention-item" key={rc.id}>
                    <div className="retention-header">
                      <div>
                        <p className="label">Case #{rc.id}</p>
                        <p className="value">
                          {rc.customer_name || `Customer #${rc.customer_id}`} 
                          {rc.customer_risk ? ` (${rc.customer_risk} Risk)` : ""}
                        </p>
                      </div>
                      <div className="retention-actions">
                        <div className="field">
                          <label>Update Status</label>
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
                        </div>
                        <div className="field">
                          <label>Update Priority</label>
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
                        </div>
                        <div className="field" style={{ display: "flex", alignItems: "flex-end", marginRight: "6px" }}>
                          <button
                            className={activeCaseId === rc.id ? "secondary" : "ghost"}
                            type="button"
                            onClick={() => activeCaseId === rc.id ? setActiveCaseId(null) : loadNotes(rc.id)}
                            style={{ height: "42px" }}
                          >
                            {activeCaseId === rc.id ? "Hide Notes" : "View Notes"}
                          </button>
                        </div>
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
              {retentionCases.length > 0 && !loadingRetention && (
                <div className="pagination">
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => setRetentionPage((p) => Math.max(1, p - 1))}
                    disabled={retentionPage === 1}
                  >
                    Prev
                  </button>
                  <span className="pagination-meta">Page {retentionPage}</span>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => setRetentionPage((p) => p + 1)}
                    disabled={!hasMore}
                  >
                    Next
                  </button>
                </div>
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
