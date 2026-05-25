import React from "react";

const scoreRows = (scorecard) => [
  ["Customer handling", scorecard?.customerHandling ?? scorecard?.handling],
  ["Process adherence", scorecard?.processAdherence ?? scorecard?.process],
  ["Communication", scorecard?.communication],
  ["Empathy", scorecard?.empathy ?? scorecard?.handling],
  ["Call closing", scorecard?.callClosing ?? scorecard?.closing],
  ["Resolution", scorecard?.resolution ?? scorecard?.closing]
];

export default function Scorecard({ scorecard }) {
  return (
    <div className="score-grid">
      {scoreRows(scorecard).map(([label, value]) => (
        <div className="score-item" key={label}>
          <span>{label}</span>
          <strong>{value ?? "--"}</strong>
          <div className="score-bar">
            <i style={{ width: `${value ?? 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
