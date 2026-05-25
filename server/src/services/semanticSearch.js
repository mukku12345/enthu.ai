const conceptMap = {
  refund: ["refund", "return", "chargeback", "money", "billing", "credit", "money back", "billing reversal", "payment return"],
  angry: ["frustrated", "angry", "upset", "escalated", "annoyed", "irritated"],
  unresolved: ["unresolved", "pending", "not resolved", "not fixed", "no solution", "follow up", "callback", "asked to call back"],
  escalation: ["escalation", "manager", "supervisor", "heated", "raised tone"],
  calm: ["calm", "reassured", "settled", "patient"],
  compliance: ["verification", "disclosure", "policy", "process", "compliance"],
  empathy: ["empathy", "apology", "acknowledged", "listened", "rapport", "care", "understood"]
};

const tokenize = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const expand = (text) => {
  const words = new Set(tokenize(text));
  Object.entries(conceptMap).forEach(([concept, terms]) => {
    if (words.has(concept) || terms.some((term) => text.toLowerCase().includes(term))) {
      terms.forEach((term) => tokenize(term).forEach((word) => words.add(word)));
    }
  });
  return words;
};

export const rankByMeaning = (calls, query) => {
  const queryTerms = expand(query);
  if (!queryTerms.size) return calls;

  return calls
    .map((call) => {
      const haystack = [
        call.originalName,
        call.summary,
        call.semanticText,
        call.resolutionStatus,
        call.customerSentiment,
        ...(call.flags ?? []),
        ...(call.transcript ?? []).map((turn) => turn.text)
      ].join(" ");
      const callTerms = expand(haystack);
      const overlap = [...queryTerms].filter((term) => callTerms.has(term)).length;
      const flagBoost = (call.flags ?? []).some((flag) =>
        [...queryTerms].some((term) => flag.toLowerCase().includes(term))
      )
        ? 2
        : 0;
      return { call, score: overlap + flagBoost };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.call);
};
