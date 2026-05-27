const compact = (items) => items.filter(Boolean).join(" ");

const scoreText = (call) => {
  const score = call.scorecard?.overall ?? call.overallScore;
  if (score == null) return "";
  return `overall qa score ${score}`;
};

const scorecardText = (scorecard = {}) =>
  compact([
    scorecard.customerHandling != null || scorecard.handling != null
      ? `customer handling score ${scorecard.customerHandling ?? scorecard.handling}`
      : "",
    scorecard.processAdherence != null || scorecard.process != null
      ? `process adherence score ${scorecard.processAdherence ?? scorecard.process}`
      : "",
    scorecard.communication != null ? `communication score ${scorecard.communication}` : "",
    scorecard.empathy != null ? `empathy score ${scorecard.empathy}` : "",
    scorecard.callClosing != null || scorecard.closing != null
      ? `call closing score ${scorecard.callClosing ?? scorecard.closing}`
      : "",
    scorecard.resolution != null ? `resolution score ${scorecard.resolution}` : ""
  ]);

const flagMeaning = (flag = "") =>
  ({
    "Angry customer":
      "customer was frustrated upset angry escalated emotional high intensity",
    "Refund issue":
      "refund billing charge payment money back credit reversal",
    Unresolved:
      "agent did not resolve issue no confirmed solution unresolved pending failed to close",
    Escalation:
      "call escalated customer asked for supervisor manager raised tone conflict",
    "Agent empathy gap":
      "agent did not show empathy limited reassurance did not acknowledge concern failed to match customer energy",
    "Process missed":
      "agent missed process verification policy disclosure required step compliance gap"
  }[flag] ?? flag);

const outcomeMeaning = (call) =>
  compact([
    call.resolutionStatus === "Unresolved"
      ? "outcome unresolved agent did not resolve customer issue no confirmed fix"
      : "",
    call.resolutionStatus === "Resolved"
      ? "outcome resolved agent confirmed next step issue fixed"
      : "",
    call.customerSentiment === "Frustrated"
      ? "customer sentiment frustrated angry upset"
      : "",
    call.customerSentiment === "Mixed" ? "customer sentiment mixed neutral uncertain" : "",
    call.customerSentiment === "Positive" ? "customer sentiment positive calm satisfied" : ""
  ]);

export const buildSemanticText = (call) =>
  compact([
    call.originalName ?? call.fileName,
    call.summary,
    call.resolutionStatus,
    call.customerSentiment,
    scoreText(call),
    scorecardText(call.scorecard),
    outcomeMeaning(call),
    ...(call.flags ?? []),
    ...(call.flags ?? []).map(flagMeaning),
    ...(call.flagDetails ?? []).map((item) => compact([item.label, item.explanation])),
    ...(call.timelineInsights ?? []),
    ...(call.segmentAnalysis ?? []).map((item) => compact([item.segment, item.finding])),
    ...(call.transcript ?? []).map((turn) =>
      compact([turn.speaker, turn.emotion, turn.text])
    )
  ]);
