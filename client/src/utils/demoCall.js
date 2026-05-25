const hashText = (text = "") =>
  [...text].reduce((sum, char) => (sum + char.charCodeAt(0) * 17) % 997, 0);

const scenarioFor = (fileName = "", id = "") => {
  const key = `${fileName} ${id}`.toLowerCase();
  if (key.includes("fail")) return "failed";
  if (key.includes("provider")) return "delivery";
  if (key.includes("kanpuriya") || key.includes("scam")) return "fraud";
  if (key.includes("ashish")) return "billing";
  return ["refund", "delivery", "billing", "fraud"][hashText(key) % 4];
};

const scenarioCopy = {
  refund: {
    issue: "refund/payment return",
    customerAsk: "I have been waiting for a refund and nobody has fixed this. I am really frustrated.",
    peak: "I do not want another callback. I need the money back or a clear answer today.",
    resolution: "The refund is eligible. I am submitting it now and sending confirmation before we close.",
    sentiment: "Frustrated",
    resolutionStatus: "Resolved",
    flags: ["Angry customer", "Refund issue", "Escalation", "Agent empathy gap"],
    scores: [86, 88, 87, 82, 85, 84],
    tones: [48, 78, 88, 96, 62, 44]
  },
  delivery: {
    issue: "missing delivery and replacement request",
    customerAsk: "My order still has not arrived and every update has been vague.",
    peak: "I need a real delivery date, not another promise.",
    resolution: "I found the carrier exception and created a replacement shipment with tracking.",
    sentiment: "Mixed",
    resolutionStatus: "Resolved",
    flags: ["Escalation", "Process missed"],
    scores: [82, 74, 84, 78, 81, 86],
    tones: [45, 66, 72, 82, 58, 39]
  },
  billing: {
    issue: "unexpected billing charge",
    customerAsk: "I was charged after cancelling and I need someone to explain why.",
    peak: "This should not be on my bill and I am annoyed that I had to call twice.",
    resolution: "I reversed the duplicate charge and documented the billing correction.",
    sentiment: "Frustrated",
    resolutionStatus: "Resolved",
    flags: ["Angry customer", "Refund issue", "Process missed"],
    scores: [84, 79, 86, 80, 83, 88],
    tones: [50, 74, 80, 90, 61, 42]
  },
  fraud: {
    issue: "fraud concern and account safety",
    customerAsk: "I think this call or payment request may be a scam and I need help.",
    peak: "I am worried my account is not safe and I need this escalated now.",
    resolution: "I blocked the risky activity, documented the fraud concern, and explained the next verification step.",
    sentiment: "Anxious",
    resolutionStatus: "Escalated",
    flags: ["Angry customer", "Escalation", "Process missed"],
    scores: [79, 72, 82, 76, 78, 74],
    tones: [54, 82, 88, 94, 72, 58]
  },
  failed: {
    issue: "failed transcription job",
    customerAsk: "Audio could not be transcribed for QA review.",
    peak: "Processing stopped before diarization and scoring completed.",
    resolution: "Retry is required before QA can trust the analysis.",
    sentiment: "Unknown",
    resolutionStatus: "Failed",
    flags: ["Process missed", "Unresolved", "Escalation"],
    scores: [60, 45, 52, 48, 42, 35],
    tones: [40, 55, 60, 68, 64, 62]
  }
};

const demoTranscript = (fileName = "uploaded-call.mp3", scenario = "refund") => {
  const copy = scenarioCopy[scenario] ?? scenarioCopy.refund;
  return [
    {
      time: "00:00",
      start: "00:00",
      speaker: "Agent",
      text: `Thanks for calling. I can help review ${fileName} and verify your account first.`,
      emotion: "steady",
      sentiment: 0.35,
      toneScore: 58
    },
    {
      time: "00:38",
      start: "00:38",
      speaker: "Customer",
      text: copy.customerAsk,
      emotion: copy.tones[1] > 75 ? "frustrated" : "concerned",
      sentiment: -0.62,
      toneScore: copy.tones[1]
    },
    {
      time: "01:14",
      start: "01:14",
      speaker: "Agent",
      text: "I understand why that is upsetting. Let me review the history and explain what I can do now.",
      emotion: "empathetic",
      sentiment: 0.44,
      toneScore: copy.scores[3] - 10
    },
    {
      time: "02:10",
      start: "02:10",
      speaker: "Customer",
      text: copy.peak,
      emotion: copy.tones[3] > 88 ? "angry" : "escalated",
      sentiment: -0.78,
      toneScore: copy.tones[3]
    },
    {
      time: "02:42",
      start: "02:42",
      speaker: "Agent",
      text: copy.resolution,
      emotion: scenario === "failed" ? "blocked" : "recovery",
      sentiment: scenario === "failed" ? -0.4 : 0.62,
      toneScore: copy.scores[5]
    },
    {
      time: "03:18",
      start: "03:18",
      speaker: "Customer",
      text: scenario === "failed" ? "Please retry this and notify QA ops." : "That helps. Please send the confirmation so I have proof.",
      emotion: scenario === "failed" ? "unresolved" : "settled",
      sentiment: scenario === "failed" ? -0.35 : 0.18,
      toneScore: copy.tones[5]
    }
  ];
};

const demoEmotionTimeline = (scenario = "refund") => {
  const copy = scenarioCopy[scenario] ?? scenarioCopy.refund;
  return [
    { time: "00:00", second: 0, agent: 42, customer: copy.tones[0], agentTone: "steady", customerTone: "neutral", event: "Opening", markerType: "opening" },
    { time: "00:45", second: 45, agent: 48, customer: copy.tones[1], agentTone: "procedural", customerTone: "frustrated", event: "Escalation point", markerType: "escalation" },
    { time: "01:30", second: 90, agent: copy.scores[3] - 24, customer: copy.tones[2], agentTone: "neutral", customerTone: "angry", event: "Agent failed to match customer energy", markerType: "mismatch" },
    { time: "02:10", second: 130, agent: copy.scores[3] - 18, customer: copy.tones[3], agentTone: "controlled", customerTone: "frustration peak", event: `Frustration peak during ${copy.issue}`, markerType: "peak" },
    { time: "02:42", second: 162, agent: copy.scores[5], customer: copy.tones[4], agentTone: "empathetic", customerTone: "settling", event: "Recovery point", markerType: "recovery" },
    { time: "03:18", second: 198, agent: copy.scores[4], customer: copy.tones[5], agentTone: "closed-loop", customerTone: copy.resolutionStatus === "Resolved" ? "calm" : "unresolved", event: `${copy.resolutionStatus} point`, markerType: copy.resolutionStatus === "Resolved" ? "resolution" : "escalation" }
  ];
};

const demoScorecard = {
  handling: 86,
  process: 88,
  communication: 87,
  empathy: 82,
  closing: 85,
  resolution: 84,
  customerHandling: 86,
  processAdherence: 88,
  callClosing: 85,
  overall: 85
};

const scorecardFor = (scenario) => {
  const scores = scenarioCopy[scenario]?.scores;
  if (!scores) return demoScorecard;
  const [handling, process, communication, empathy, closing, resolution] = scores;
  const overall = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  return {
    handling,
    process,
    communication,
    empathy,
    closing,
    resolution,
    customerHandling: handling,
    processAdherence: process,
    callClosing: closing,
    overall
  };
};

const demoFlags = ["Angry customer", "Refund issue", "Escalation", "Agent empathy gap"];

const legacyFlagMap = {
  "Customer frustration detected during middle third": "Angry customer",
  "Customer frustration detected during the call": "Angry customer",
  "Agent recovered tone after escalation": "Escalation",
  "Agent used recovery language after tension": "Escalation",
  "Process risk: verification or disclosure gap": "Process missed",
  "Weak close: outcome not confirmed": "Unresolved"
};

const normalizeFlags = (flags = []) => {
  const mapped = flags.map((flag) => legacyFlagMap[flag] ?? flag);
  const unique = [...new Set(mapped.filter(Boolean))];
  return unique.length ? unique : demoFlags;
};

const flagDetails = demoFlags.map((flag) => ({
  label: flag,
  explanation:
    {
      "Angry customer": "Customer showed frustration and urgency around the refund.",
      "Refund issue": "The customer asked for money back/payment return.",
      Escalation: "Customer tone rose during the middle of the call.",
      "Agent empathy gap": "Agent stayed neutral before fully acknowledging the frustration."
    }[flag] ?? "QA review recommended."
}));

const flagDetailsFor = (flags) =>
  flags.map((flag) => ({
    label: flag,
    explanation:
      {
        "Angry customer": "Customer showed high emotional intensity.",
        "Refund issue": "Call includes refund, money back, or billing reversal intent.",
        Escalation: "Customer emotion rose during the middle of the call.",
        "Agent empathy gap": "Agent response lagged behind customer emotion.",
        "Process missed": "A required verification, policy, or documentation step may be missing.",
        Unresolved: "The call did not close with a confirmed resolution."
      }[flag] ?? "QA review recommended."
  }));

const isLegacyFallback = (call) =>
  call.analysisProvider == null ||
  call.semanticText === "refund billing frustrated unresolved escalation empathy compliance confirmation resolution tone mismatch customer frustration agent recovery" ||
  (call.flags ?? []).some((flag) => legacyFlagMap[flag]);

export const normalizeCallForDemo = (call) => {
  const fileName = call.fileName ?? call.originalName ?? "uploaded-call.mp3";
  const scenario = scenarioFor(fileName, call.id ?? call._id ?? call.storedName);
  const copy = scenarioCopy[scenario] ?? scenarioCopy.refund;
  const isFailed = call.status === "failed";
  const shouldUseDemoProfile = isLegacyFallback(call);
  const scorecard = shouldUseDemoProfile ? scorecardFor(scenario) : call.scorecard?.overall ? call.scorecard : scorecardFor(scenario);
  const transcript = shouldUseDemoProfile || !call.transcript?.length ? demoTranscript(fileName, scenario) : call.transcript;
  const flags = shouldUseDemoProfile
    ? copy.flags
    : isFailed
      ? normalizeFlags([...(call.flags ?? []), "Process missed", "Unresolved"])
      : normalizeFlags(call.flags);
  const emotionTimeline = !shouldUseDemoProfile && call.emotionTimeline?.length
    ? call.emotionTimeline.map((point, index) => ({
        time: point.time ?? `0${Math.floor((point.second ?? index * 30) / 60)}:${String((point.second ?? index * 30) % 60).padStart(2, "0")}`,
        agent: point.agent ?? 50,
        customer: point.customer ?? 50,
        ...point
      }))
    : demoEmotionTimeline(scenario);

  return {
    ...call,
    fileName,
    uploadedAt: call.uploadedAt ?? call.createdAt,
    scorecard,
    scores: call.scores ?? {
      customerHandling: scorecard.customerHandling ?? scorecard.handling,
      processAdherence: scorecard.processAdherence ?? scorecard.process,
      communication: scorecard.communication,
      empathy: scorecard.empathy ?? scorecard.handling,
      callClosing: scorecard.callClosing ?? scorecard.closing,
      resolution: scorecard.resolution ?? scorecard.closing
    },
    overallScore: call.overallScore ?? scorecard.overall,
    summary:
      call.summary ??
      (isFailed
        ? `Processing failed for ${fileName}. Demo failure context: transcription could not complete and QA ops was notified.`
        : `Demo QA analysis: the customer contacted support about ${copy.issue}. The agent verified context, acknowledged the concern, and worked toward a ${copy.resolutionStatus.toLowerCase()} outcome. QA should review tone matching, process adherence, and whether the closing clearly documented next steps.`),
    transcript,
    emotionTimeline,
    flags,
    flagDetails: shouldUseDemoProfile || !call.flagDetails?.length ? flagDetailsFor(flags) : call.flagDetails,
    timelineInsights: call.timelineInsights?.length
      ? call.timelineInsights
      : [
          "Customer frustration peaked at 02:10 during refund discussion.",
          `Customer frustration peaked at 02:10 during ${copy.issue}.`,
          "Agent tone stayed neutral while customer emotion escalated.",
          "Agent recovered after acknowledging the issue.",
          copy.resolutionStatus === "Resolved" ? "Customer settled after resolution was offered." : "Customer remained unresolved and needed follow-up."
        ],
    segmentAnalysis: call.segmentAnalysis?.length
      ? call.segmentAnalysis
      : [
          { segment: "Opening", finding: "Agent opened calmly and started verification." },
          { segment: "Issue discovery", finding: `Customer explained ${copy.issue}.` },
          { segment: "Conflict/escalation", finding: "Customer tone rose faster than agent tone adapted." },
          { segment: "Resolution", finding: copy.resolution },
          { segment: "Closing", finding: copy.resolutionStatus === "Resolved" ? "Agent confirmed follow-up and documentation." : "Call remained open for QA follow-up." }
        ],
    customerSentiment: shouldUseDemoProfile ? copy.sentiment : call.customerSentiment ?? (isFailed ? "Unknown" : copy.sentiment),
    resolutionStatus: shouldUseDemoProfile ? copy.resolutionStatus : call.resolutionStatus ?? (isFailed ? "Failed" : copy.resolutionStatus),
    analysisProvider: call.analysisProvider ?? "demo-fallback"
  };
};

export const buildDemoFailedCall = () =>
  normalizeCallForDemo({
    id: "demo-failed-call",
    _id: "demo-failed-call",
    originalName: "failed-refund-escalation-demo.mp3",
    storedName: "failed-refund-escalation-demo.mp3",
    size: 2441000,
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    status: "failed",
    progress: 100,
    stage: "Processing failed",
    failureReason:
      "Transcription failed for call failed-refund-escalation-demo.mp3. Slack notification sent to QA ops.",
    flags: ["Process missed", "Unresolved", "Escalation"]
  });
