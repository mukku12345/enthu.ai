import mongoose from "mongoose";
import { getQueueStats } from "../services/jobQueue.js";

export const getHealth = (_req, res) => {
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? "mongo" : "memory",
    fileStorage: process.env.STORAGE_DRIVER === "s3" ? "s3" : "local",
    queue: getQueueStats()
  });
};
