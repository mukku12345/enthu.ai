import { updateCall } from "./store.js";
import { canGenerateEmbeddings, createEmbedding, getEmbeddingConfig } from "./embeddingProvider.js";
import { buildSemanticText } from "./semanticText.js";

const FIELD_WEIGHTS = {
  originalName: 1.6,
  summary: 3,
  semanticText: 2.7,
  resolutionStatus: 2,
  customerSentiment: 1.7,
  flags: 2.8,
  flagDetails: 2.4,
  transcript: 3,
  timelineInsights: 2,
  segmentAnalysis: 1.8,
  scorecard: 1.4
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "call",
  "calls",
  "customer",
  "customers",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "his",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "she",
  "show",
  "that",
  "the",
  "their",
  "them",
  "this",
  "to",
  "was",
  "we",
  "who",
  "with"
]);

const normalizeText = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const stem = (token) =>
  token
    .replace(/(ational|fulness|ousness|iveness|tional)$/i, "")
    .replace(/(ing|edly|edly|ment|ness|able|ible|ed|ly|es|s)$/i, "")
    .replace(/frustrat.*/, "frustrat")
    .replace(/unresolv.*/, "resolv")
    .replace(/resolv.*/, "resolv")
    .replace(/confirm.*/, "confirm")
    .replace(/charg.*/, "charg")
    .replace(/deliver.*/, "deliver");

const wordsFrom = (text = "") =>
  normalizeText(text)
    .split(" ")
    .map(stem)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

const addFeature = (vector, key, value) => {
  if (!key || !Number.isFinite(value) || value <= 0) return;
  vector[key] = (vector[key] ?? 0) + value;
};

const addTokenFeatures = (vector, text, weight = 1) => {
  const tokens = wordsFrom(text);

  tokens.forEach((token) => addFeature(vector, `tok:${token}`, weight));

  for (let index = 0; index < tokens.length - 1; index += 1) {
    addFeature(vector, `bi:${tokens[index]}_${tokens[index + 1]}`, weight * 1.8);
  }

  for (let index = 0; index < tokens.length - 2; index += 1) {
    addFeature(vector, `tri:${tokens[index]}_${tokens[index + 1]}_${tokens[index + 2]}`, weight * 2.4);
  }

  tokens.forEach((token) => {
    if (token.length < 5) return;
    for (let index = 0; index <= token.length - 4; index += 1) {
      addFeature(vector, `char:${token.slice(index, index + 4)}`, weight * 0.18);
    }
  });
};

const scoreNumberText = (call) => {
  const score = call.scorecard?.overall ?? call.overallScore;
  if (score == null) return "";

  const bucket = Math.floor(score / 10) * 10;
  return [
    `overall score ${score}`,
    `qa score ${score}`,
    `score bucket ${bucket}`,
    score < 70 ? "score below seventy" : "",
    score >= 85 ? "score above eighty five" : ""
  ].join(" ");
};

const fieldTextsFor = (call) => ({
  originalName: call.originalName ?? call.fileName,
  summary: call.summary,
  semanticText: `${call.semanticText ?? ""} ${buildSemanticText(call)}`,
  resolutionStatus: call.resolutionStatus,
  customerSentiment: call.customerSentiment,
  flags: (call.flags ?? []).join(" "),
  flagDetails: (call.flagDetails ?? []).map((item) => `${item.label} ${item.explanation}`).join(" "),
  transcript: (call.transcript ?? []).map((turn) => `${turn.speaker} ${turn.text} ${turn.emotion ?? ""}`).join(" "),
  timelineInsights: (call.timelineInsights ?? []).join(" "),
  segmentAnalysis: (call.segmentAnalysis ?? []).map((item) => `${item.segment} ${item.finding}`).join(" "),
  scorecard: scoreNumberText(call)
});

const buildDocumentVector = (call) => {
  const vector = {};
  const fields = fieldTextsFor(call);

  Object.entries(fields).forEach(([field, text]) => {
    if (!text) return;
    addTokenFeatures(vector, text, FIELD_WEIGHTS[field] ?? 1);
  });

  return vector;
};

const buildQueryVector = (query) => {
  const vector = {};
  addTokenFeatures(vector, query, 1);
  return vector;
};

const dot = (left, right) =>
  Object.entries(left).reduce((sum, [key, value]) => sum + value * (right[key] ?? 0), 0);

const magnitude = (vector) =>
  Math.sqrt(Object.values(vector).reduce((sum, value) => sum + value * value, 0));

const cosine = (left, right) => {
  const denominator = magnitude(left) * magnitude(right);
  return denominator ? dot(left, right) / denominator : 0;
};

const cosineArray = (left = [], right = []) => {
  const length = Math.min(left.length, right.length);
  if (!length) return 0;

  let product = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    const leftValue = Number(left[index]) || 0;
    const rightValue = Number(right[index]) || 0;
    product += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator ? product / denominator : 0;
};

const applyIdf = (vector, idf) =>
  Object.fromEntries(
    Object.entries(vector).map(([key, value]) => [key, value * (idf.get(key) ?? 1)])
  );

const buildIdf = (vectors) => {
  const documentCount = Math.max(vectors.length, 1);
  const documentFrequency = new Map();

  vectors.forEach((vector) => {
    Object.keys(vector).forEach((key) => {
      documentFrequency.set(key, (documentFrequency.get(key) ?? 0) + 1);
    });
  });

  return new Map(
    [...documentFrequency.entries()].map(([key, frequency]) => [
      key,
      Math.log((1 + documentCount) / (1 + frequency)) + 1
    ])
  );
};

const exactPhraseScore = (query, call) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const allText = normalizeText(Object.values(fieldTextsFor(call)).join(" "));
  if (allText.includes(normalizedQuery)) return 0.25;

  const queryTokens = wordsFrom(query);
  if (!queryTokens.length) return 0;
  const textTokens = new Set(wordsFrom(allText));
  const tokenMatches = queryTokens.filter((token) => textTokens.has(token)).length;

  let score = queryTokens.length ? (tokenMatches / queryTokens.length) * 0.12 : 0;
  for (let index = 0; index < queryTokens.length - 1; index += 1) {
    if (allText.includes(`${queryTokens[index]} ${queryTokens[index + 1]}`)) score += 0.05;
  }
  return Math.min(score, 0.25);
};

const rankByLexicalFallback = (calls, query) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return calls;

  const documentVectors = calls.map((call) => ({ call, vector: buildDocumentVector(call) }));
  const idf = buildIdf(documentVectors.map((entry) => entry.vector));
  const queryVector = applyIdf(buildQueryVector(normalizedQuery), idf);

  if (!Object.keys(queryVector).length) return calls;

  const ranked = documentVectors
    .map(({ call, vector }) => {
      const weightedDocumentVector = applyIdf(vector, idf);
      return {
        call,
        score: cosine(queryVector, weightedDocumentVector) + exactPhraseScore(normalizedQuery, call)
      };
    })
    .filter((entry) => entry.score > 0.035)
    .sort((a, b) => b.score - a.score);

  const bestScore = ranked[0]?.score ?? 0;
  return ranked
    .filter((entry) => entry.score >= bestScore * 0.6)
    .map((entry) => entry.call);
};

const ensureCallEmbedding = async (call) => {
  const config = getEmbeddingConfig();

  if (
    call.semanticEmbedding?.length &&
    call.semanticEmbeddingModel === config.model &&
    call.semanticEmbeddingProvider === config.provider
  ) {
    return call;
  }

  if (call.status !== "completed") return call;

  const semanticText = call.semanticText || buildSemanticText(call);
  if (!semanticText.trim()) return call;

  const semanticEmbedding = await createEmbedding(semanticText);
  if (!semanticEmbedding?.length) return call;

  const patch = {
    semanticText,
    semanticEmbedding,
    semanticEmbeddingModel: config.model,
    semanticEmbeddingProvider: config.provider,
    semanticEmbeddingUpdatedAt: new Date()
  };

  await updateCall(call.id, patch);
  return { ...call, ...patch };
};

const rankByEmbedding = async (calls, query) => {
  if (!canGenerateEmbeddings()) return null;

  try {
    const queryEmbedding = await createEmbedding(query);
    if (!queryEmbedding?.length) return null;

    const embeddedCalls = await Promise.all(calls.map(ensureCallEmbedding));
    const ranked = embeddedCalls
      .map((call) => ({
        call,
        score: cosineArray(queryEmbedding, call.semanticEmbedding)
      }))
      .sort((a, b) => b.score - a.score)
      .filter((entry) => entry.score > 0.12)
      .slice(0, 25)
      .map((entry) => entry.call);

    return ranked;
  } catch (error) {
    console.warn(`Embedding semantic search unavailable, using fallback: ${error.message}`);
    return null;
  }
};

export const rankByMeaning = async (calls, query) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return calls;

  const embeddingResults = await rankByEmbedding(calls, normalizedQuery);
  if (embeddingResults) return embeddingResults;

  return rankByLexicalFallback(calls, normalizedQuery);
};
