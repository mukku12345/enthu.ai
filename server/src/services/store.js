import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { Call } from "../models/Call.js";

let memoryCalls = [];

export const hasMongo = () => mongoose.connection.readyState === 1;

const normalize = (doc) => {
  const value = doc?.toObject ? doc.toObject() : doc;
  if (!value) return value;
  return {
    ...value,
    fileName: value.originalName,
    uploadedAt: value.createdAt,
    overallScore: value.overallScore ?? value.scorecard?.overall,
    scores: value.scorecard
      ? {
          customerHandling: value.scorecard.customerHandling ?? value.scorecard.handling,
          processAdherence: value.scorecard.processAdherence ?? value.scorecard.process,
          communication: value.scorecard.communication,
          empathy: value.scorecard.empathy ?? value.scorecard.handling,
          callClosing: value.scorecard.callClosing ?? value.scorecard.closing,
          resolution: value.scorecard.resolution ?? value.scorecard.closing
        }
      : undefined,
    resolutionStatus: value.resolutionStatus ?? (value.status === "completed" ? "Resolved" : "Pending"),
    customerSentiment: value.customerSentiment ?? "Mixed",
    analysisProvider:
      value.analysisProvider || (value.status === "completed" ? "demo-fallback" : undefined),
    id: String(value._id ?? value.id)
  };
};

export const createCall = async (data) => {
  if (hasMongo()) return normalize(await Call.create(data));
  const now = new Date();
  const call = {
    ...data,
    _id: nanoid(),
    id: nanoid(),
    status: data.status ?? "queued",
    progress: data.progress ?? 0,
    stage: data.stage ?? "Waiting for worker",
    transcript: [],
    flags: [],
    emotionTimeline: [],
    createdAt: now,
    updatedAt: now
  };
  memoryCalls.unshift(call);
  return normalize(call);
};

export const listCalls = async () => {
  if (hasMongo()) return (await Call.find().sort({ createdAt: -1 })).map(normalize);
  return memoryCalls.map(normalize);
};

export const findDuplicateCall = async ({ originalName, size }) => {
  if (hasMongo()) {
    return normalize(await Call.findOne({ originalName, size }).sort({ createdAt: -1 }));
  }
  return normalize(memoryCalls.find((call) => call.originalName === originalName && call.size === size));
};

export const getCall = async (id) => {
  if (hasMongo()) return normalize(await Call.findById(id));
  return normalize(memoryCalls.find((call) => call.id === id || call._id === id));
};

export const updateCall = async (id, patch) => {
  if (hasMongo()) {
    return normalize(
      await Call.findByIdAndUpdate(id, patch, { new: true, runValidators: true })
    );
  }
  const index = memoryCalls.findIndex((call) => call.id === id || call._id === id);
  if (index === -1) return null;
  memoryCalls[index] = { ...memoryCalls[index], ...patch, updatedAt: new Date() };
  return normalize(memoryCalls[index]);
};

export const deleteCall = async (id) => {
  if (hasMongo()) {
    if (mongoose.Types.ObjectId.isValid(id)) return normalize(await Call.findByIdAndDelete(id));
    return normalize(await Call.findOneAndDelete({ id }));
  }
  const call = memoryCalls.find((item) => item.id === id || item._id === id);
  memoryCalls = memoryCalls.filter((item) => item.id !== id && item._id !== id);
  return normalize(call);
};
