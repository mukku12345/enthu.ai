import React, { useState } from "react";
import { CloudUpload } from "lucide-react";
import { toast } from "react-toastify";
import { uploadCall } from "../../api/callsApi.js";

const CLIENT_BATCH_SIZE = 25;

const fileKey = (file) => `${file.name}-${file.size}`;

const uploadErrorMessage = (error) => {
  const message = error.response?.data?.message ?? "Upload failed";
  const detail = error.response?.data?.detail;
  return detail ? `${message}: ${detail}` : message;
};

export default function UploadPanel({ onUploaded, existingCalls = [] }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const existingKeys = new Set(existingCalls.map((call) => `${call.fileName ?? call.originalName}-${call.size}`));

  const submit = async (event) => {
    event.preventDefault();
    if (!files.length) return;

    const form = event.currentTarget;
    setUploading(true);

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

      if (uniqueFiles.length) {
        for (let index = 0; index < uniqueFiles.length; index += CLIENT_BATCH_SIZE) {
          const batch = uniqueFiles.slice(index, index + CLIENT_BATCH_SIZE);
          const results = await Promise.allSettled(batch.map((file) => uploadCall(file)));
          results.forEach((result, resultIndex) => {
            if (result.status === "fulfilled") {
              uploaded.push(...result.value.uploaded);
              skipped.push(...result.value.skipped.map((item) => item.message));
              return;
            }
            skipped.push(`${batch[resultIndex].name}: ${uploadErrorMessage(result.reason)}`);
          });
        }
      }

      if (uploaded.length) onUploaded(uploaded);
      if (uploaded.length) {
        const successMessage = `${uploaded.length} uploaded successfully${
          skipped.length ? `, ${skipped.length} duplicate/skipped.` : "."
        }`;
        toast.success(successMessage, { toastId: "upload-success" });
      }
      if (skipped.length) {
        const skippedMessage = uploaded.length
          ? `${skipped.length} duplicate/skipped.`
          : `${skipped.length} duplicate/skipped. ${skipped[0]}`;
        toast.warning(skippedMessage, { toastId: "upload-skipped" });
      }
      setFiles([]);
      form.reset();
    } catch (err) {
      toast.error(uploadErrorMessage(err), { toastId: "upload-error" });
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
    </form>
  );
}
