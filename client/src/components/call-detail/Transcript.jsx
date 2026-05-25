import React from "react";
import EmptyState from "../shared/EmptyState.jsx";

export default function Transcript({ turns }) {
  return (
    <div className="transcript">
      <div className="section-title">
        <h3>Transcript</h3>
        <span>{turns.length} speaker turns</span>
      </div>
      {turns.map((turn, index) => (
        <div className={`turn ${turn.speaker.toLowerCase()}`} key={`${turn.start}-${index}`}>
          <span>{turn.time ?? turn.start}</span>
          <strong>{turn.speaker}</strong>
          <p>
            {turn.text}
            <small>{turn.emotion ? `${turn.emotion} tone: ${turn.toneScore ?? "--"}` : ""}</small>
          </p>
        </div>
      ))}
      {turns.length === 0 && (
        <EmptyState
          className="small"
          message="Transcript will appear as soon as diarization completes."
        />
      )}
    </div>
  );
}
