import { useEffect, useRef, useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import LoginModal from "./LoginModal";
import UserManagementModal from "./UserManagementModal";
import RetentionModal from "./RetentionModal";
import IntakeModal from "./IntakeModal";

export default function ModalWrapper() {
  const { activeModal, setActiveModal } = useAppContext();
  const modalRef = useRef(null);
  const lastFocusRef = useRef(null);

  const modalTitle = useMemo(() => {
    if (activeModal === "login") return "Access Control";
    if (activeModal === "users") return "User Management";
    if (activeModal === "customers") return "Customer Registry";
    if (activeModal === "retention") return "Retention Workflow";
    if (activeModal === "intake") return "Customer Intake";
    return "";
  }, [activeModal]);

  useEffect(() => {
    if (!activeModal) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    lastFocusRef.current = document.activeElement;
    const focusable = modalEl.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first && typeof first.focus === "function") {
      first.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveModal(null);
        return;
      }
      if (event.key !== "Tab") return;
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (lastFocusRef.current && typeof lastFocusRef.current.focus === "function") {
        lastFocusRef.current.focus();
      }
    };
  }, [activeModal, setActiveModal]);

  if (!activeModal) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={() => setActiveModal(null)}
      role="presentation"
    >
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-title-${activeModal}`}
        ref={modalRef}
      >
        <div className="modal-header">
          <h3 id={`modal-title-${activeModal}`}>{modalTitle}</h3>
          <button
            className="secondary"
            type="button"
            onClick={() => setActiveModal(null)}
            aria-label="Close dialog"
          >
            Close
          </button>
        </div>
        
        {activeModal === "login" && <LoginModal />}
        {activeModal === "users" && <UserManagementModal />}
        {activeModal === "retention" && <RetentionModal />}
        {activeModal === "intake" && <IntakeModal />}
      </div>
    </div>
  );
}
