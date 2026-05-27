import { deleteCall, getCall, listCalls, updateCall } from "../services/store.js";
import { addEvent } from "../services/eventLog.js";
import { enqueueJob } from "../services/jobQueue.js";
import { processCall } from "../services/processor.js";
import { processUploadedFile } from "../services/callUploadService.js";
import { rankByMeaning } from "../services/semanticSearch.js";

export const createCallUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Audio file is required" });

    const result = await processUploadedFile(req.file);
    if (result.duplicate) {
      return res.status(409).json({
        message: result.message,
        duplicate: true,
        call: result.call
      });
    }

    res.status(202).json(result.call);
  } catch (error) {
    console.error("Upload failed", error);
    res.status(500).json({
      message: "Unable to store uploaded call",
      detail: error.message
    });
  }
};

export const createBulkCallUpload = async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: "At least one audio file is required" });

    const results = [];
    for (const file of req.files) {
      results.push(await processUploadedFile(file));
    }

    res.status(202).json({
      uploaded: results.filter((item) => !item.duplicate).map((item) => item.call),
      skipped: results
        .filter((item) => item.duplicate)
        .map((item) => ({ message: item.message, call: item.call })),
      total: results.length
    });
  } catch (error) {
    console.error("Bulk upload failed", error);
    res.status(500).json({
      message: "Unable to store uploaded calls",
      detail: error.message
    });
  }
};

export const retryCall = async (req, res) => {
  const call = await getCall(req.params.id);
  if (!call) return res.status(404).json({ message: "Call not found" });

  const retriedCall = await updateCall(call.id, {
    status: "queued",
    progress: 5,
    stage: "Retry queued",
    failureReason: undefined
  });

  addEvent({
    type: "queued",
    callId: call.id,
    fileName: call.originalName,
    message: `Retry queued for ${call.originalName}`
  });
  enqueueJob(() => processCall(call.id));
  res.json(retriedCall);
};

export const listCallRecords = async (req, res) => {
  const calls = await listCalls();
  const query = String(req.query.q ?? "").trim();
  res.json(query ? rankByMeaning(calls, query) : calls);
};

export const getCallRecord = async (req, res) => {
  const call = await getCall(req.params.id);
  if (!call) return res.status(404).json({ message: "Call not found" });
  res.json(call);
};

export const deleteCallRecord = async (req, res) => {
  try {
    const deleted = await deleteCall(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Call not found" });

    addEvent({
      type: "info",
      callId: deleted.id,
      fileName: deleted.originalName,
      message: `Deleted ${deleted.originalName}`
    });

    res.json({ ok: true, call: deleted });
  } catch (error) {
    console.error("Delete failed", error);
    res.status(500).json({ message: "Unable to delete uploaded call", detail: error.message });
  }
};
