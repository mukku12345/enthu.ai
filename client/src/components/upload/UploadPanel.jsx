import React, { useState } from "react";
import { AlertCircle, CheckCircle2, CloudUpload, X } from "lucide-react";
import { uploadCall } from "../../api/callsApi.js";

const CLIENT_BATCH_SIZE = 25;

const fileKey = (file) => `${file.name}-${file.size}`;

export default function UploadPanel({ onUploaded, existingCalls = [] }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const existingKeys = new Set(existingCalls.map((call) => `${call.fileName ?? call.originalName}-${call.size}`));

  const submit = async (event) => {
    event.preventDefault();
    if (!files.length) return;

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const uniqueFiles = [];
      const skippedLocal = [];
      const seen = new Set();

      files.forEach((file) => {
        const key = fileKey(file);
        if (seen.has(key) || existingKeys.has(key)) {
          skippedLocal.push(`${file.name} already exists and was skipped.`);
          return;
        }
        seen.add(key);
        uniqueFiles.push(file);
      });

      const uploaded = [];
      const skipped = [...skippedLocal];

      for (let index = 0; index < uniqueFiles.length; index += CLIENT_BATCH_SIZE) {
        const batch = uniqueFiles.slice(index, index + CLIENT_BATCH_SIZE);
        const results = await Promise.all(batch.map((file) => uploadCall(file)));
        results.forEach((result) => {
          uploaded.push(...result.uploaded);
          skipped.push(...result.skipped.map((item) => item.message));
        });
      }

      onUploaded(uploaded);
      if (uploaded.length) {
        setNotice(
          `${uploaded.length} uploaded successfully${
            skipped.length ? `, ${skipped.length} duplicate/skipped.` : "."
          }`
        );
      }
      if (skipped.length) {
        setError(uploaded.length ? skipped[0] : `${skipped.length} duplicate/skipped. ${skipped[0]}`);
      }
      setFiles([]);
      event.currentTarget.reset();
    } catch (err) {
      const detail = err.response?.data?.detail ? `: ${err.response.data.detail}` : "";
      setError(`${err.response?.data?.message ?? "Upload failed"}${detail}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="upload-panel" onSubmit={submit}>
      <div>
        <p className="eyebrow">Async call intake</p>
        <h1>QA intelligence for every sales call</h1>
        <p className="hero-copy">
          Upload a recording, queue analysis, review transcript, scorecard, flags, and the agent/customer emotion arc.
        </p>
      </div>

      <label className="drop-zone">
        <CloudUpload size={30} />
        <span>
          {files.length
            ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
            : "Drop or choose recorded calls"}
        </span>
        <small>mp3, wav, m4a, or bulk audio exports. Uploads run in batches of 25.</small>
        <input
          type="file"
          multiple
          accept="audio/*,.mp3,.wav,.m4a"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
      </label>

      <button className="primary" type="submit" disabled={!files.length || uploading}>
        <CloudUpload size={18} />
        {uploading ? "Uploading" : files.length > 1 ? "Upload calls" : "Upload call"}
      </button>

      {(notice || error) && (
        <div className={`upload-message ${error && !notice ? "warning" : "success"}`}>
          <div className="upload-message-icon">
            {error && !notice ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div className="upload-message-copy">
            <strong>{error && !notice ? "Upload skipped" : "Upload summary"}</strong>
            {notice && <p className="success-text">{notice}</p>}
            {error && !notice && <p className="error-text">{error}</p>}
            {error && notice && <p className="muted-text">{error}</p>}
          </div>
          <button
            className="toast-close"
            onClick={() => {
              setNotice("");
              setError("");
            }}
            type="button"
            title="Dismiss upload message"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </form>
  );
}
