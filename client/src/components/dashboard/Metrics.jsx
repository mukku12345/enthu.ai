import React from "react";
import { AlertTriangle, BarChart3, Headphones, ShieldCheck } from "lucide-react";
import Metric from "./Metric.jsx";

export default function Metrics({ calls }) {
  const completed = calls.filter((call) => call.status === "completed");
  const average =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, call) => sum + (call.scorecard?.overall ?? 0), 0) /
            completed.length
        )
      : 0;
  const flagged = calls.filter((call) => call.flags?.length).length;
  const processing = calls.filter((call) => call.status === "processing").length;

  return (
    <section className="metrics">
      <Metric icon={Headphones} label="Calls uploaded" value={calls.length} />
      <Metric icon={BarChart3} label="Average QA score" value={average || "--"} />
      <Metric icon={AlertTriangle} label="Flagged calls" value={flagged} />
      <Metric icon={ShieldCheck} label="Non-blocking queue" value={processing} />
    </section>
  );
}
