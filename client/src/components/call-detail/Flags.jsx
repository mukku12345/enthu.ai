import React from "react";
import { AlertTriangle } from "lucide-react";

export default function Flags({ flags, details = [] }) {
  if (!flags.length) return null;

  return (
    <div className="flags">
      {flags.map((flag) => (
        <span key={flag} title={details.find((item) => item.label === flag)?.explanation}>
          <AlertTriangle size={15} />
          <b>{flag}</b>
          <small>{details.find((item) => item.label === flag)?.explanation}</small>
        </span>
      ))}
    </div>
  );
}
