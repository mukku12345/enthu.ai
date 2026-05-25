import mongoose from "mongoose";

const emotionPointSchema = new mongoose.Schema(
  {
    time: String,
    second: Number,
    agent: Number,
    customer: Number,
    agentTone: String,
    customerTone: String,
    event: String,
    markerType: String
  },
  { _id: false }
);

const transcriptTurnSchema = new mongoose.Schema(
  {
    time: String,
    start: String,
    end: String,
    speaker: String,
    text: String,
    sentiment: Number,
    emotion: String,
    toneScore: Number
  },
  { _id: false }
);

const scoreSchema = new mongoose.Schema(
  {
    handling: Number,
    process: Number,
    communication: Number,
    empathy: Number,
    closing: Number,
    resolution: Number,
    customerHandling: Number,
    processAdherence: Number,
    callClosing: Number,
    overall: Number
  },
  { _id: false }
);

const callSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    storageDriver: { type: String, enum: ["local", "s3"], default: "local" },
    storagePath: String,
    s3Bucket: String,
    s3Key: String,
    s3Url: String,
    mimeType: String,
    size: Number,
    duration: Number,
    overallScore: Number,
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued"
    },
    progress: { type: Number, default: 0 },
    stage: { type: String, default: "Waiting for worker" },
    summary: String,
    analysisProvider: { type: String, default: "demo-fallback" },
    transcript: [transcriptTurnSchema],
    scorecard: scoreSchema,
    emotionTimeline: [emotionPointSchema],
    flags: [String],
    flagDetails: [
      new mongoose.Schema(
        {
          label: String,
          explanation: String
        },
        { _id: false }
      )
    ],
    timelineInsights: [String],
    segmentAnalysis: [
      new mongoose.Schema(
        {
          segment: String,
          finding: String
        },
        { _id: false }
      )
    ],
    resolutionStatus: String,
    customerSentiment: String,
    semanticText: String,
    failureReason: String,
    processedAt: Date
  },
  { timestamps: true }
);

export const Call = mongoose.model("Call", callSchema);
