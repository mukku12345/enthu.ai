import fs from "fs/promises";

const ASSEMBLY_BASE_URL = "https://api.assemblyai.com/v2";
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 80;

const formatTime = (ms = 0) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const sentimentScore = {
  POSITIVE: 0.6,
  NEUTRAL: 0,
  NEGATIVE: -0.6
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assemblyHeaders = () => ({
  authorization: process.env.ASSEMBLYAI_API_KEY
});

const uploadLocalAudio = async (storagePath) => {
  const audio = await fs.readFile(storagePath);
  const response = await fetch(`${ASSEMBLY_BASE_URL}/upload`, {
    method: "POST",
    headers: assemblyHeaders(),
    body: audio
  });

  if (!response.ok) {
    throw new Error(`AssemblyAI upload failed with ${response.status}`);
  }

  const data = await response.json();
  return data.upload_url;
};

const getAudioUrl = async (call) => {
  if (call.s3Url) return call.s3Url;
  if (call.storageDriver === "local" && call.storagePath) return uploadLocalAudio(call.storagePath);
  throw new Error("No readable audio source available for transcription");
};

const requestTranscript = async (audioUrl) => {
  const response = await fetch(`${ASSEMBLY_BASE_URL}/transcript`, {
    method: "POST",
    headers: {
      ...assemblyHeaders(),
      "content-type": "application/json"
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      speakers_expected: 2,
      sentiment_analysis: true,
      punctuate: true,
      format_text: true
    })
  });

  if (!response.ok) {
    throw new Error(`AssemblyAI transcript request failed with ${response.status}`);
  }

  return response.json();
};

const pollTranscript = async (id) => {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    const response = await fetch(`${ASSEMBLY_BASE_URL}/transcript/${id}`, {
      headers: assemblyHeaders()
    });

    if (!response.ok) {
      throw new Error(`AssemblyAI polling failed with ${response.status}`);
    }

    const transcript = await response.json();
    if (transcript.status === "completed") return transcript;
    if (transcript.status === "error") {
      throw new Error(transcript.error || "AssemblyAI transcription failed");
    }

    await wait(POLL_INTERVAL_MS);
  }

  throw new Error("AssemblyAI transcription timed out");
};

const mapSpeaker = (speaker, speakerMap) => {
  if (!speakerMap.has(speaker)) {
    speakerMap.set(speaker, speakerMap.size === 0 ? "Agent" : "Customer");
  }
  return speakerMap.get(speaker);
};

const buildSentimentLookup = (sentimentResults = []) =>
  sentimentResults.map((item) => ({
    start: item.start,
    end: item.end,
    score: sentimentScore[item.sentiment] ?? 0
  }));

const findSentiment = (turn, lookup) => {
  const match = lookup.find((item) => item.start <= turn.start && item.end >= turn.end);
  return match?.score ?? 0;
};

const toTranscriptTurns = (assemblyTranscript) => {
  const speakerMap = new Map();
  const sentimentLookup = buildSentimentLookup(assemblyTranscript.sentiment_analysis_results);

  return (assemblyTranscript.utterances ?? []).map((turn) => ({
    time: formatTime(turn.start),
    start: formatTime(turn.start),
    end: formatTime(turn.end),
    speaker: mapSpeaker(turn.speaker, speakerMap),
    text: turn.text,
    sentiment: findSentiment(turn, sentimentLookup),
    emotion: findSentiment(turn, sentimentLookup) < -0.35 ? "frustrated" : "neutral",
    toneScore: Math.round(Math.abs(findSentiment(turn, sentimentLookup)) * 70 + 30)
  }));
};

export const transcribeCallWithProvider = async (call) => {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    return null;
  }

  const audioUrl = await getAudioUrl(call);
  const requested = await requestTranscript(audioUrl);
  const completed = await pollTranscript(requested.id);
  const transcript = toTranscriptTurns(completed);

  if (!transcript.length) {
    throw new Error("AssemblyAI returned no speaker turns");
  }

  return {
    provider: "assemblyai",
    transcript,
    duration: completed.audio_duration ? Math.round(completed.audio_duration) : undefined,
    fullText: completed.text ?? ""
  };
};
