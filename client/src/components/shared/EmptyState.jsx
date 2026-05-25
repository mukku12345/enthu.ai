import React from "react";

export default function EmptyState({ className = "", message }) {
  return <div className={`empty ${className}`.trim()}>{message}</div>;
}
