import React from "react";
import { Headphones } from "lucide-react";
import EmotionChart from "./EmotionChart.jsx";
import Flags from "./Flags.jsx";
import Scorecard from "./Scorecard.jsx";
import Transcript from "./Transcript.jsx";

export default function CallDetail({ call, onRetry, onDismiss }) {
  if (!call) {
    return (
      <section className="detail placeholder">
        <Headphones size={42} />
        <h2>Select a call</h2>
        <p>Completed analyses show speaker turns, scorecards, flags, and emotional movement here.</p>
      </section>
    );
  }

  return (
    <section className="detail">
      <div className="detail-head">
        <div>
          <p className="eyebrow">Call review</p>
          <h2>{call.originalName}</h2>
        </div>
        <div className="detail-badges">
          <span className="provider-pill">{call.analysisProvider ?? "demo-fallback"}</span>
          <span className={`pill ${call.status}`}>{call.status}</span>
        </div>
      </div>

      {call.status === "failed" && (
        <div className="failure retry-box">
          <span>Processing failed: {call.failureReason}</span>
          <div className="retry-actions">
            <button className="secondary" onClick={() => onRetry(call)} type="button">
              Retry
            </button>
            <button className="ghost-button" onClick={() => onDismiss(call)} type="button">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="summary-band">
        <div>
          <span>Overall</span>
          <strong>{call.scorecard?.overall ?? "--"}</strong>
        </div>
        <p>
          {call.summary ??
            "Analysis is still running. The interface remains usable while the worker finishes."}
        </p>
      </div>

      <Scorecard scorecard={call.scorecard} />
      <EmotionChart
        data={call.emotionTimeline ?? []}
        insights={call.timelineInsights ?? []}
        segments={call.segmentAnalysis ?? []}
      />
      <Flags flags={call.flags ?? []} details={call.flagDetails ?? []} />
      <Transcript turns={call.transcript ?? []} />
    </section>
  );
}
