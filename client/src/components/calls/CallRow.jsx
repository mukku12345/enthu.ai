import React from "react";
import { CheckCircle2, Clock3, Sparkles, XCircle } from "lucide-react";
import { formatDate } from "../../utils/date.js";

const statusIcon = {
  queued: Clock3,
  processing: Sparkles,
  completed: CheckCircle2,
  failed: XCircle
};

export default function CallRow({ call, isActive, onSelect }) {
  const Icon = statusIcon[call.status] ?? Clock3;

  return (
    <button
      className={`call-row ${isActive ? "active" : ""}`}
      onClick={() => onSelect(call)}
      type="button"
    >
      <div className={`status-dot ${call.status}`}>
        <Icon size={16} />
      </div>
      <div className="call-row-main">
        <strong>{call.originalName}</strong>
        <span>{call.stage}</span>
        <div className="progress-track">
          <i style={{ width: `${call.progress ?? 0}%` }} />
        </div>
      </div>
      <div className="call-row-score">
        <strong>{call.scorecard?.overall ?? "--"}</strong>
        <span>{formatDate(call.createdAt)}</span>
      </div>
    </button>
  );
}
