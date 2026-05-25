import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { createCall, findDuplicateCall, getCall, listCalls, updateCall } from "./services/store.js";
import { addEvent, listEvents } from "./services/eventLog.js";
import { enqueueJob, getQueueStats } from "./services/jobQueue.js";
import { processCall } from "./services/processor.js";
import { saveUploadedCallFile } from "./services/fileStorage.js";
import { rankByMeaning } from "./services/semanticSearch.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 }
});

const processUploadedFile = async (file) => {
  const duplicate = await findDuplicateCall({
    originalName: file.originalname,
    size: file.size
  });

  if (duplicate) {
    return {
      duplicate: true,
      call: duplicate,
      message: `${file.originalname} already exists and was skipped.`
    };
  }

  const storedFile = await saveUploadedCallFile(file);
  const call = await createCall({
    ...storedFile,
    status: "queued",
    progress: 5,
    stage: "Queued for transcription"
  });

  addEvent({
    type: "queued",
    callId: call.id,
    fileName: call.originalName,
    message: `Job queued for ${call.originalName}`
  });
  enqueueJob(() => processCall(call.id));

  return { duplicate: false, call };
};

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "enthuai_qa",
      serverSelectionTimeoutMS: 5000
    })
    .then(() => console.log("MongoDB connected"))
    .catch((error) => console.warn("MongoDB unavailable, using memory store", error.message));
} else {
  console.warn("MONGO_URI not set, using memory store for demo data");
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? "mongo" : "memory",
    fileStorage: process.env.STORAGE_DRIVER === "s3" ? "s3" : "local",
    queue: getQueueStats()
  });
});

app.post("/api/calls", upload.single("call"), async (req, res) => {
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
});

app.post("/api/calls/bulk", upload.array("calls", 100), async (req, res) => {
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
});

app.post("/api/calls/:id/retry", async (req, res) => {
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
});

app.get("/api/events", (_req, res) => {
  res.json(listEvents());
});

app.get("/api/calls", async (req, res) => {
  const calls = await listCalls();
  const query = String(req.query.q ?? "").trim();
  res.json(query ? rankByMeaning(calls, query) : calls);
});

app.get("/api/calls/:id", async (req, res) => {
  const call = await getCall(req.params.id);
  if (!call) return res.status(404).json({ message: "Call not found" });
  res.json(call);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
