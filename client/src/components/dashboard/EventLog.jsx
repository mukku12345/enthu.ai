import React from "react";
import { BellRing } from "lucide-react";
import { formatDate } from "../../utils/date.js";

export default function EventLog({ events }) {
  const hasEvents = events.length > 0;

  return (
    <section className="panel event-log">
      <div className="section-title">
        <h3>System events</h3>
        <span>Async processing log</span>
      </div>
      {hasEvents && events.slice(0, 6).map((event) => (
        <div className={`event-item ${event.type}`} key={event.id}>
          <BellRing size={15} />
          <div>
            <strong>{event.message}</strong>
            <span>{formatDate(event.createdAt)}</span>
          </div>
        </div>
      ))}
      {!hasEvents && (
        <div className="empty small">Upload a call to watch queued, transcription, emotion, embeddings, and completion events appear step by step.</div>
      )}
    </section>
  );
}
