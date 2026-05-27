import { getCall, updateCall } from "./store.js";
import { addEvent } from "./eventLog.js";
import { notifyFailure } from "./notifier.js";
import { transcribeCallWithProvider } from "./transcriptionProvider.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hasAssemblyAI = () => Boolean(process.env.ASSEMBLYAI_API_KEY);
const allowDemoFallback = () => process.env.ALLOW_DEMO_FALLBACK === "true";

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

const countMatches = (text, pattern) => text.match(pattern)?.length ?? 0;

const hasMatch = (text, pattern) => {
  pattern.lastIndex = 0;
  return pattern.test(text);
};

const average = (values, fallback = 0) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;

const clampScore = (score) => Math.max(45, Math.min(96, Math.round(score)));

const customerRiskPattern =
  /\b(angry|upset|frustrat|cancel|refund|charge|charged|billing|complain|scam|fraud|wrong|late|delay|broken|not working|issue|problem|poor|bad|never|again|escalat|supervisor|manager|callback)\b/g;

const agentEmpathyPattern =
  /\b(sorry|apolog|understand|appreciate|help|concern|frustrat|right away|let me|i can)\b/g;

const processPattern =
  /\b(verify|verification|account|policy|eligible|document|ticket|case|reference|process|check|review|history|details)\b/g;

const resolutionPattern =
  /\b(resolved|resolution|confirm|confirmation|sent|email|refund|replacement|fixed|done|next step|follow up|callback|submit|created|booked)\b/g;

const negativePattern =
  /\b(no|not|never|cannot|can't|wont|won't|failed|issue|problem|angry|frustrat|bad|wrong|delay|late|scam|fraud|complain)\b/g;

const positivePattern =
  /\b(thanks|thank|okay|ok|great|good|resolved|helpful|appreciate|confirm|done)\b/g;

const inferSentiment = (text, explicitSentiment = 0) => {
  if (Math.abs(explicitSentiment) > 0.05) return explicitSentiment;

  const negative = countMatches(text, negativePattern);
  const positive = countMatches(text, positivePattern);
  if (negative === positive) return 0;
  return Math.max(-0.7, Math.min(0.7, (positive - negative) * 0.18));
};

const summarizeTranscript = (transcript, seed = "") => {
  const text = textFromTranscript(transcript);
  const agentText = transcript
    .filter((turn) => turn.speaker === "Agent")
    .map((turn) => turn.text)
    .join(" ")
    .toLowerCase();
  const customerTurns = transcript.filter((turn) => turn.speaker === "Customer");
  const topic = text.includes("refund") || text.includes("charge") || seed.includes("refund")
    ? "a refund or billing concern"
    : text.includes("scam") || text.includes("fraud")
      ? "a possible fraud or scam concern"
      : text.includes("order") || text.includes("delivery")
        ? "an order or delivery issue"
        : "a support issue that needed a clear resolution";
  const customerTone = customerTurns.some((turn) => inferSentiment(turn.text.toLowerCase(), turn.sentiment) < -0.35)
    ? "The customer showed frustration during the call."
    : "The customer tone stayed mostly neutral.";
  const agentTone = transcript.some((turn) => turn.speaker === "Agent" && inferSentiment(turn.text.toLowerCase(), turn.sentiment) > 0.25)
    ? "The agent used positive, reassuring language."
    : countMatches(agentText, processPattern) > countMatches(agentText, agentEmpathyPattern)
      ? "The agent kept the conversation procedural."
      : "The agent gave limited reassurance.";

  return `The call focused on ${topic}. ${customerTone} ${agentTone} The review should focus on whether the agent acknowledged the concern, followed the right process, explained the next step, and closed with confirmation.`;
};

const scoreTranscript = (transcript, seed) => {
  const text = textFromTranscript(transcript);
  const agentText = transcript
    .filter((turn) => turn.speaker === "Agent")
    .map((turn) => turn.text)
    .join(" ")
    .toLowerCase();
  const customerText = transcript
    .filter((turn) => turn.speaker === "Customer")
    .map((turn) => turn.text)
    .join(" ")
    .toLowerCase();

  if (!text.trim()) return scoreCall(seed);

  const agentTurns = transcript.filter((turn) => turn.speaker === "Agent");
  const customerTurns = transcript.filter((turn) => turn.speaker === "Customer");
  const agentWordCount = agentText.split(/\s+/).filter(Boolean).length;
  const customerWordCount = customerText.split(/\s+/).filter(Boolean).length;
  const totalWordCount = Math.max(agentWordCount + customerWordCount, 1);
  const talkRatio = agentWordCount / totalWordCount;
  const customerSentiments = customerTurns.map((turn) => inferSentiment(turn.text.toLowerCase(), turn.sentiment));
  const agentSentiments = agentTurns.map((turn) => inferSentiment(turn.text.toLowerCase(), turn.sentiment));
  const customerAvg = average(customerSentiments);
  const agentAvg = average(agentSentiments);
  const customerLow = Math.min(...customerSentiments, 0);
  const riskCount = countMatches(`${customerText} ${seed}`, customerRiskPattern);
  const empathyHits = countMatches(agentText, agentEmpathyPattern);
  const processHits = countMatches(agentText, processPattern);
  const resolutionHits = countMatches(agentText, resolutionPattern);
  const questionCount = countMatches(agentText, /\?/g);
  const closingTurn = agentTurns.at(-1)?.text?.toLowerCase() ?? "";
  const closedClearly = hasMatch(closingTurn, resolutionPattern) || /anything else|confirmation|sent/.test(closingTurn);

  const empathy = clampScore(72 + empathyHits * 5 + agentAvg * 14 + Math.min(customerAvg, 0) * 8 - riskCount * 2);
  const process = clampScore(68 + processHits * 5 + (agentText.length > 120 ? 5 : 0) - (processHits === 0 ? 10 : 0));
  const communication = clampScore(
    70 +
      Math.min(transcript.length, 10) * 2 +
      (talkRatio >= 0.35 && talkRatio <= 0.68 ? 8 : -6) +
      Math.min(questionCount, 3) * 3 -
      riskCount
  );
  const closing = clampScore(62 + resolutionHits * 5 + (closedClearly ? 10 : 0) - (customerLow < -0.45 && !closedClearly ? 8 : 0));
  const resolution = clampScore(58 + resolutionHits * 7 + (closedClearly ? 8 : 0) - riskCount * 2);
  const handling = clampScore((empathy + communication + Math.max(55, 82 + customerAvg * 20 - riskCount * 2)) / 3);

  const overall = clampScore((handling + process + communication + empathy + closing + resolution) / 6);
  return {
    handling,
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

const buildTimelineInsights = (transcript, scorecard) => {
  const customerTurns = transcript.filter((turn) => turn.speaker === "Customer");
  const peak = customerTurns.reduce(
    (max, turn) => ((turn.toneScore ?? 0) > (max?.toneScore ?? -1) ? turn : max),
    null
  );
  const agentAvg =
    transcript
      .filter((turn) => turn.speaker === "Agent")
      .reduce((sum, turn) => sum + (turn.toneScore ?? 50), 0) /
    Math.max(transcript.filter((turn) => turn.speaker === "Agent").length, 1);

  return [
    peak
      ? `Customer emotion peaked at ${peak.time ?? peak.start} during: "${peak.text.slice(0, 90)}${peak.text.length > 90 ? "..." : ""}"`
      : "Customer emotional peak could not be isolated from the transcript.",
    agentAvg < 55
      ? "Agent tone stayed mostly neutral while customer emotion moved higher."
      : "Agent tone became more active during higher-intensity customer moments.",
    scorecard.empathy >= 80
      ? "Agent used empathy or acknowledgement language in the transcript."
      : "Empathy language was limited and should be reviewed by QA.",
    scorecard.resolution >= 80
      ? "The call appears to close with a concrete next step or confirmation."
      : "The call may need QA follow-up because the resolution was not clearly confirmed."
  ];
};

const buildSegmentAnalysis = (transcript) => {
  const pickText = (index) => transcript[index]?.text ?? "No clear transcript segment available.";
  return [
    { segment: "Opening", finding: pickText(0) },
    { segment: "Issue discovery", finding: pickText(1) },
    { segment: "Conflict/escalation", finding: pickText(Math.floor(transcript.length / 2)) },
    { segment: "Resolution", finding: pickText(Math.max(transcript.length - 2, 0)) },
    { segment: "Closing", finding: pickText(Math.max(transcript.length - 1, 0)) }
  ];
};

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
    await wait(300);

    const seed = `${call.originalName} ${call.storedName}`.toLowerCase();

    let providerResult = null;
    try {
      providerResult = await transcribeCallWithProvider(call);
    } catch (error) {
      if (hasAssemblyAI() || !allowDemoFallback()) throw error;
      console.warn(`AssemblyAI is not configured, using opt-in demo fallback: ${error.message}`);
    }

    const transcript = providerResult?.transcript ?? buildTranscript(seed);
    await updateCall(callId, { progress: 42, stage: "Separating agent and customer speakers", transcript });
    addEvent({
      type: "processing",
      callId,
      fileName: call.originalName,
      message: `Speaker diarization completed for ${call.originalName}`
    });
    await wait(300);

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
    addEvent({
      type: "processing",
      callId,
      fileName: call.originalName,
      message: `Emotion and QA scoring completed for ${call.originalName}`
    });
    await wait(300);

    addEvent({
      type: "processing",
      callId,
      fileName: call.originalName,
      message: `Semantic search text generated for ${call.originalName}`
    });

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
      timelineInsights: buildTimelineInsights(transcript, scorecard),
      segmentAnalysis: buildSegmentAnalysis(transcript),
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
