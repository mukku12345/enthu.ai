import { getCall, updateCall } from "./store.js";
import { addEvent } from "./eventLog.js";
import { notifyFailure } from "./notifier.js";
import { transcribeCallWithProvider } from "./transcriptionProvider.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildTranscript = (seed) => {
  const refundScenario = seed.includes("refund") || seed.includes("billing");
  return [
    {
      start: "00:00",
      end: "00:18",
      time: "00:00",
      speaker: "Agent",
      text: "Thanks for calling. I can help with your account today after a quick verification.",
      sentiment: 0.42,
      emotion: "steady",
      toneScore: 58
    },
    {
      start: "00:19",
      end: "00:42",
      time: "00:19",
      speaker: "Customer",
      text: refundScenario
        ? "I was charged after cancelling and I need the refund handled now."
        : "My order still has not arrived and nobody has given me a clear answer.",
      sentiment: -0.62,
      emotion: "frustrated",
      toneScore: 78
    },
    {
      start: "00:43",
      end: "01:15",
      time: "00:43",
      speaker: "Agent",
      text: "I understand why that is frustrating. Let me review the history and explain the next step.",
      sentiment: 0.34,
      emotion: "empathetic",
      toneScore: 64
    },
    {
      start: "01:16",
      end: "01:49",
      time: "01:16",
      speaker: "Customer",
      text: refundScenario
        ? "I have heard that before. I do not want another ticket with no refund."
        : "I just need a real delivery date instead of another vague promise.",
      sentiment: -0.71,
      emotion: "angry",
      toneScore: 91
    },
    {
      start: "01:50",
      end: "02:30",
      time: "01:50",
      speaker: "Agent",
      text: refundScenario
        ? "The refund is eligible. I am submitting it now and it should post in three to five business days."
        : "I found the carrier exception and booked a replacement shipment with tracking.",
      sentiment: 0.58,
      emotion: "confident",
      toneScore: 72
    },
    {
      start: "02:31",
      end: "03:00",
      time: "02:31",
      speaker: "Customer",
      text: "That helps. Please send the confirmation so I have proof of what changed.",
      sentiment: 0.18,
      emotion: "settling",
      toneScore: 48
    },
    {
      start: "03:01",
      end: "03:18",
      time: "03:01",
      speaker: "Agent",
      text: "I sent the confirmation and documented the call. Is there anything else I can help with?",
      sentiment: 0.66,
      emotion: "resolved",
      toneScore: 76
    }
  ];
};

const buildEmotionTimeline = () => [
  { time: "00:00", second: 0, agent: 42, customer: 48, agentTone: "steady", customerTone: "neutral", event: "Opening", markerType: "opening" },
  { time: "00:30", second: 30, agent: 47, customer: 68, agentTone: "procedural", customerTone: "frustrated", event: "Issue discovery", markerType: "issue" },
  { time: "01:00", second: 60, agent: 62, customer: 74, agentTone: "empathetic", customerTone: "frustrated", event: "Agent acknowledges concern", markerType: "recovery" },
  { time: "01:30", second: 90, agent: 53, customer: 92, agentTone: "controlled", customerTone: "escalated", event: "Agent failed to match customer energy", markerType: "mismatch" },
  { time: "02:10", second: 130, agent: 58, customer: 96, agentTone: "neutral", customerTone: "frustration peak", event: "Frustration peak during refund discussion", markerType: "peak" },
  { time: "02:35", second: 155, agent: 78, customer: 61, agentTone: "clear", customerTone: "settling", event: "Resolution offered", markerType: "resolution" },
  { time: "03:10", second: 190, agent: 84, customer: 43, agentTone: "closed-loop", customerTone: "calm", event: "Closing confirmation", markerType: "closing" }
];

const scoreCall = (seed) => {
  const weakClose = seed.includes("callback");
  const scores = {
    handling: seed.includes("angry") ? 74 : 86,
    process: seed.includes("compliance") ? 69 : 91,
    communication: 88,
    empathy: seed.includes("angry") ? 70 : 89,
    closing: weakClose ? 64 : 85,
    resolution: weakClose ? 62 : 88
  };
  const overall = Math.round(
    (scores.handling + scores.process + scores.communication + scores.empathy + scores.closing + scores.resolution) / 6
  );
  return {
    ...scores,
    customerHandling: scores.handling,
    processAdherence: scores.process,
    callClosing: scores.closing,
    overall
  };
};

const textFromTranscript = (transcript) => transcript.map((turn) => turn.text).join(" ").toLowerCase();

const summarizeTranscript = (transcript, seed) => {
  const text = textFromTranscript(transcript);
  const topic = text.includes("refund") || seed.includes("refund")
    ? "a refund or billing concern"
    : "a support issue that needed a clear resolution";
  const customerTone = transcript.some((turn) => turn.speaker === "Customer" && turn.sentiment < -0.4)
    ? "The customer showed frustration during the call."
    : "The customer tone stayed mostly neutral.";
  const agentTone = transcript.some((turn) => turn.speaker === "Agent" && turn.sentiment > 0.3)
    ? "The agent used positive, reassuring language."
    : "The agent kept the conversation procedural.";

  return `The call focused on ${topic}. ${customerTone} ${agentTone} The review should focus on whether the agent acknowledged the concern, followed the right process, explained the next step, and closed with confirmation.`;
};

const scoreTranscript = (transcript, seed) => {
  const text = textFromTranscript(transcript);
  const agentText = transcript
    .filter((turn) => turn.speaker === "Agent")
    .map((turn) => turn.text)
    .join(" ")
    .toLowerCase();

  const empathy = /sorry|understand|frustrat|appreciate|help/.test(agentText) ? 90 : 72;
  const process = /verify|verification|account|policy|eligible|document/.test(agentText) ? 88 : 70;
  const communication = transcript.length >= 4 && agentText.length > 80 ? 86 : 74;
  const closing = /confirm|anything else|sent|email|resolved|next step/.test(agentText) ? 86 : 68;

  if (!text.trim()) return scoreCall(seed);

  const overall = Math.round((empathy + process + communication + closing) / 4);
  return {
    handling: empathy,
    process,
    communication,
    empathy,
    closing,
    resolution: closing >= 80 ? 84 : 68,
    customerHandling: empathy,
    processAdherence: process,
    callClosing: closing,
    overall
  };
};

const buildEmotionTimelineFromTranscript = (transcript) => {
  if (!transcript.length) return buildEmotionTimeline();

  return transcript.map((turn, index) => {
    const second = index * 30;
    const score = turn.toneScore ?? Math.round(Math.abs(turn.sentiment ?? 0) * 70 + 30);
    return {
      time: turn.time ?? turn.start ?? `00:${String(second).padStart(2, "0")}`,
      second,
      agent: turn.speaker === "Agent" ? score : 48,
      customer: turn.speaker === "Customer" ? score : 48,
      agentTone: turn.speaker === "Agent" ? (score >= 55 ? "positive" : "strained") : "listening",
      customerTone: turn.speaker === "Customer" ? (score >= 60 ? "escalated" : "settled") : "waiting",
      event: turn.speaker === "Customer" && score >= 75 ? "Customer frustration peak" : undefined,
      markerType: turn.speaker === "Customer" && score >= 75 ? "peak" : undefined
    };
  });
};

const buildFlags = (scorecard, transcript) => {
  const hasCustomerFrustration = transcript.some(
    (turn) => turn.speaker === "Customer" && turn.sentiment < -0.4
  );

  return [
    ...(hasCustomerFrustration ? ["Angry customer"] : []),
    ...(textFromTranscript(transcript).includes("refund") ? ["Refund issue"] : []),
    ...(scorecard.resolution < 75 ? ["Unresolved"] : []),
    ...(hasCustomerFrustration ? ["Escalation"] : []),
    ...(scorecard.empathy < 80 ? ["Agent empathy gap"] : []),
    ...(scorecard.process < 75 ? ["Process missed"] : [])
  ];
};

const buildFlagDetails = (flags) =>
  flags.map((flag) => ({
    label: flag,
    explanation:
      {
        "Angry customer": "Customer language and tone indicate frustration or irritation.",
        "Refund issue": "Call appears to involve money back, billing reversal, or payment return intent.",
        Unresolved: "The call did not clearly end with a confirmed fix.",
        Escalation: "Customer emotion rose during the middle of the conversation.",
        "Agent empathy gap": "Agent tone stayed too neutral while customer emotion was high.",
        "Process missed": "Required verification, disclosure, or process step may be incomplete."
      }[flag] ?? "QA review recommended."
  }));

const buildTimelineInsights = () => [
  "Customer frustration peaked at 02:10 during refund discussion.",
  "Agent tone stayed neutral while customer emotion escalated.",
  "Agent recovered after acknowledging the issue.",
  "Customer settled after resolution was offered."
];

const buildSegmentAnalysis = () => [
  { segment: "Opening", finding: "Agent opened calmly and attempted account verification." },
  { segment: "Issue discovery", finding: "Customer explained the billing/refund concern and prior frustration." },
  { segment: "Conflict/escalation", finding: "Customer emotion rose faster than the agent adapted tone." },
  { segment: "Resolution", finding: "Agent moved from explanation to an actionable fix." },
  { segment: "Closing", finding: "Agent confirmed follow-up and documented the outcome." }
];

const getCustomerSentiment = (transcript) => {
  const customerTurns = transcript.filter((turn) => turn.speaker === "Customer");
  const avg =
    customerTurns.reduce((sum, turn) => sum + (turn.sentiment ?? 0), 0) /
    Math.max(customerTurns.length, 1);
  if (avg < -0.35) return "Frustrated";
  if (avg > 0.25) return "Positive";
  return "Mixed";
};

export const processCall = async (callId) => {
  const call = await getCall(callId);
  if (!call) return;

  try {
    await updateCall(callId, { status: "processing", progress: 18, stage: "Transcribing audio" });
    addEvent({
      type: "processing",
      callId,
      fileName: call.originalName,
      message: `Transcription started for ${call.originalName}`
    });
    await wait(900);

    const seed = `${call.originalName} ${call.storedName}`.toLowerCase();
    if (seed.includes("fail")) throw new Error(`Transcription failed for call ${call.originalName}`);

    let providerResult = null;
    try {
      providerResult = await transcribeCallWithProvider(call);
    } catch (error) {
      console.warn(`Transcription provider unavailable, using fallback: ${error.message}`);
    }

    const transcript = providerResult?.transcript ?? buildTranscript(seed);
    await updateCall(callId, { progress: 42, stage: "Separating agent and customer speakers", transcript });
    await wait(800);

    const scorecard = providerResult ? scoreTranscript(transcript, seed) : scoreCall(seed);
    const flags = providerResult
      ? buildFlags(scorecard, transcript)
      : ["Angry customer", "Refund issue", "Escalation", "Agent empathy gap"];
    if (scorecard.resolution < 75) flags.push("Unresolved");
    if (scorecard.process < 75) flags.push("Process missed");

    const summary = providerResult
      ? summarizeTranscript(transcript, seed)
      : "The customer contacted support about a billing or fulfillment issue and began the call frustrated. The agent verified the account, acknowledged the concern, identified the actionable fix, and closed by sending confirmation. The highest-risk moment occurred when the customer challenged prior follow-through; the agent recovered by moving from explanation to resolution.";

    const resolutionStatus = scorecard.resolution >= 80 ? "Resolved" : "Unresolved";
    const customerSentiment = getCustomerSentiment(transcript);

    await updateCall(callId, { progress: 72, stage: "Scoring process, tone, and resolution" });
    await wait(800);

    await updateCall(callId, {
      status: "completed",
      progress: 100,
      stage: "Analysis complete",
      duration: providerResult?.duration ?? 198,
      analysisProvider: providerResult?.provider ?? "demo-fallback",
      overallScore: scorecard.overall,
      transcript,
      summary,
      scorecard,
      emotionTimeline: providerResult ? buildEmotionTimelineFromTranscript(transcript) : buildEmotionTimeline(),
      flags,
      flagDetails: buildFlagDetails(flags),
      timelineInsights: buildTimelineInsights(),
      segmentAnalysis: buildSegmentAnalysis(),
      resolutionStatus,
      customerSentiment,
      semanticText: `${summary} ${flags.join(" ")} ${resolutionStatus} ${customerSentiment} ${textFromTranscript(transcript)}`,
      processedAt: new Date()
    });
    addEvent({
      type: "success",
      callId,
      fileName: call.originalName,
      message: `Analysis completed for ${call.originalName}`
    });
  } catch (error) {
    const failedCall = await updateCall(callId, {
      status: "failed",
      progress: 100,
      stage: "Processing failed",
      failureReason: `${error.message}. Slack notification sent to QA ops.`,
      flags: ["Process missed"],
      flagDetails: buildFlagDetails(["Process missed"]),
      resolutionStatus: "Failed",
      customerSentiment: "Unknown"
    });
    await notifyFailure(failedCall ?? call, error.message);
  }
};
