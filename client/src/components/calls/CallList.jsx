import React from "react";
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

export default function CallList({ calls, selectedId, onSelect }) {
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
        </div>
        {calls.map((call) => (
          <button
            className={`call-table-row ${selectedId === call.id ? "active" : ""}`}
            key={call.id}
            onClick={() => onSelect(call)}
            type="button"
          >
            <strong>{call.fileName ?? call.originalName}</strong>
            <span>{formatDate(call.uploadedAt ?? call.createdAt)}</span>
            <span className={`status-badge ${call.status}`}>{call.status}</span>
            <span>{call.overallScore ?? call.scorecard?.overall ?? "--"}</span>
            <span>{call.customerSentiment ?? "--"}</span>
            <span>{call.resolutionStatus ?? "--"}</span>
            <span className="table-flags">
              {((call.flags?.length ? call.flags : ["Angry customer"])
                .filter((flag) => visibleFlags.includes(flag))
                .slice(0, 3))
                .map((flag) => (
                  <i key={flag}>{flag}</i>
                ))}
            </span>
          </button>
        ))}
      </div>
      {calls.length === 0 && (
        <EmptyState message="No calls yet. Upload a recording to start the queue." />
      )}
    </section>
  );
}
