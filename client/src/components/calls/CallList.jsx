import React from "react";
import { Trash2 } from "lucide-react";
import EmptyState from "../shared/EmptyState.jsx";
import { formatDate } from "../../utils/date.js";

const visibleFlags = [
  "Angry customer",
  "Refund issue",
  "Unresolved",
  "Escalation",
  "Agent empathy gap",
  "Process missed"
];

export default function CallList({ calls, selectedId, onSelect, onRequestDelete }) {
  const handleDelete = (event, call) => {
    event.stopPropagation();
    onRequestDelete(call);
  };

  return (
    <section className="call-table-panel">
      <div className="section-title">
        <h3>Uploaded calls</h3>
        <span>{calls.length} records</span>
      </div>
      <div className="call-table">
        <div className="call-table-head">
          <span>File</span>
          <span>Uploaded</span>
          <span>Status</span>
          <span>Score</span>
          <span>Sentiment</span>
          <span>Resolution</span>
          <span>Flags</span>
          <span>Action</span>
        </div>
        {calls.map((call) => (
          <div
            className={`call-table-row ${selectedId === call.id ? "active" : ""}`}
            key={call.id}
            onClick={() => onSelect(call)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(call);
            }}
            role="button"
            tabIndex={0}
          >
            <strong data-label="File">{call.fileName ?? call.originalName}</strong>
            <span data-label="Uploaded">{formatDate(call.uploadedAt ?? call.createdAt)}</span>
            <span className={`status-badge ${call.status}`} data-label="Status">
              {call.status}
            </span>
            <span data-label="Score">{call.overallScore ?? call.scorecard?.overall ?? "--"}</span>
            <span data-label="Sentiment">{call.customerSentiment ?? "--"}</span>
            <span data-label="Resolution">{call.resolutionStatus ?? "--"}</span>
            <span className="table-flags" data-label="Flags">
              {((call.flags?.length ? call.flags : [])
                .filter((flag) => visibleFlags.includes(flag))
                .slice(0, 3))
                .map((flag) => (
                  <i key={flag}>{flag}</i>
                ))}
            </span>
            <button
              aria-label={`Delete ${call.fileName ?? call.originalName}`}
              className="row-delete"
              onClick={(event) => handleDelete(event, call)}
              title="Delete call"
              type="button"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      {calls.length === 0 && (
        <EmptyState message="No calls yet. Upload a recording to start the queue." />
      )}
    </section>
  );
}
