import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  call,
  busy = false,
  error,
  onCancel,
  onConfirm
}) {
  if (!call) return null;

  const fileName = call.fileName ?? call.originalName;

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        aria-labelledby="delete-call-title"
        aria-modal="true"
        className="confirm-modal"
        role="dialog"
      >
        <button
          aria-label="Close delete confirmation"
          className="modal-close"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          <X size={18} />
        </button>
        <div className="modal-icon">
          <AlertTriangle size={22} />
        </div>
        <div>
          <p className="eyebrow">Delete uploaded call</p>
          <h3 id="delete-call-title">Remove this call from dashboard?</h3>
          <p>
            This will delete <strong>{fileName}</strong> from the application database and remove it
            from the uploaded calls list.
          </p>
          {error && <p className="modal-error">{error}</p>}
        </div>
        <div className="modal-actions">
          <button className="ghost-button" disabled={busy} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="danger-button" disabled={busy} onClick={onConfirm} type="button">
            {busy ? "Deleting..." : "Delete call"}
          </button>
        </div>
      </div>
    </div>
  );
}
