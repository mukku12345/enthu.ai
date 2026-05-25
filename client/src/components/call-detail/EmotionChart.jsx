import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const markerColor = {
  escalation: "#b62d24",
  peak: "#b62d24",
  recovery: "#0f6d5c",
  resolution: "#0f6d5c",
  mismatch: "#b77900",
  closing: "#245ec2"
};

export default function EmotionChart({ data, insights = [], segments = [] }) {
  const markers = data.filter((point) => point.markerType);

  return (
    <div className="chart-panel">
      <div className="section-title">
        <h3>Emotion and tone arc</h3>
        <span>Agent and customer over call timeline</span>
      </div>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          {data.length ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e1e8" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} label={{ value: "Tone intensity", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              {markers.map((marker) => (
                <ReferenceDot
                  key={`${marker.time}-${marker.markerType}`}
                  x={marker.time}
                  y={Math.max(marker.agent ?? 0, marker.customer ?? 0)}
                  r={5}
                  fill={markerColor[marker.markerType] ?? "#60717f"}
                  stroke="#ffffff"
                />
              ))}
              <Line type="monotone" dataKey="agent" stroke="#246bfe" strokeWidth={3} dot={false} />
              <Line
                type="monotone"
                dataKey="customer"
                stroke="#f05a4f"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          ) : (
            <AreaChart data={[{ second: 0, agent: 0, customer: 0 }]}>
              <Area dataKey="agent" fill="#eef4ff" stroke="#9db6ee" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="marker-legend">
        {markers.map((marker) => (
          <span key={`${marker.time}-${marker.event}`}>
            <i style={{ background: markerColor[marker.markerType] ?? "#60717f" }} />
            {marker.time}: {marker.event}
          </span>
        ))}
      </div>
      <div className="insight-grid">
        <div>
          <h3>Timeline insights</h3>
          {insights.map((insight) => (
            <p key={insight}>{insight}</p>
          ))}
        </div>
        <div>
          <h3>Segment analysis</h3>
          {segments.map((segment) => (
            <p key={segment.segment}>
              <strong>{segment.segment}:</strong> {segment.finding}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
