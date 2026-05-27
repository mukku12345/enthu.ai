const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export const getEmbeddingConfig = () => ({
  provider: process.env.EMBEDDING_PROVIDER || "openai",
  model: process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
  enabled: Boolean(process.env.OPENAI_API_KEY)
});

export const canGenerateEmbeddings = () => {
  const config = getEmbeddingConfig();
  return config.provider === "openai" && config.enabled;
};

export const createEmbedding = async (input) => {
  const config = getEmbeddingConfig();
  const text = String(input ?? "").trim();

  if (!text) return null;
  if (config.provider !== "openai") {
    throw new Error(`Unsupported embedding provider: ${config.provider}`);
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for embedding search");
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      input: text.slice(0, 24000)
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Embedding request failed with ${response.status}: ${detail}`);
  }

  const data = await response.json();
  return data.data?.[0]?.embedding ?? null;
};
