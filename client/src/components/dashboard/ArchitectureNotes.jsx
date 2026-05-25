import React from "react";
import { Network } from "lucide-react";

const notes = [
  "Upload is separated from processing so the UI is never blocked.",
  "Audio files would be stored in S3 or object storage.",
  "Processing would run in background workers using Redis/BullMQ.",
  "Transcription, diarization, scoring, emotion analysis, and embeddings are separate pipeline steps.",
  "Failed jobs are retried and notify QA ops.",
  "Semantic search would use embeddings plus a vector database.",
  "The design scales from 10 calls/day to 10,000 calls/day by adding workers."
];

export default function ArchitectureNotes() {
  return (
    <section className="panel architecture-panel">
      <div className="section-title">
        <h3>Architecture & Scaling Notes</h3>
        <Network size={18} />
      </div>
      <ul>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}
