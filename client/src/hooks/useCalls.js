import { useCallback, useEffect, useRef, useState } from "react";
import { getCalls, retryCall } from "../api/callsApi.js";

const POLLING_INTERVAL_MS = 1800;
const pipelineSteps = [
  { delay: 0, type: "queued", message: "upload received", status: "queued", progress: 8 },
  { delay: 650, type: "queued", message: "queued", status: "queued", progress: 18 },
  { delay: 1400, type: "processing", message: "transcription started", status: "processing", progress: 36 },
  { delay: 2300, type: "processing", message: "emotion analysis completed", status: "processing", progress: 62 },
  { delay: 3100, type: "processing", message: "embeddings generated", status: "processing", progress: 84 },
  { delay: 4000, type: "success", message: "completed", status: "completed", progress: 100 }
];

const timestamp = (offsetMinutes = 0) => {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  return date.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
};

export function useCalls() {
  const [calls, setCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const queryRef = useRef("");

  const syncSelectedCall = useCallback((freshCalls) => {
    setSelectedCall((current) => {
      if (!current) return freshCalls[0] ?? null;
      return freshCalls.find((call) => call.id === current.id) ?? current;
    });
  }, []);

  const loadCalls = useCallback(
    async (searchQuery = "") => {
      const freshCalls = await getCalls(searchQuery);
      setCalls(freshCalls);
      syncSelectedCall(freshCalls);
    },
    [syncSelectedCall]
  );

  useEffect(() => {
    loadCalls("");
    const timer = setInterval(() => loadCalls(queryRef.current), POLLING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadCalls]);

  const searchCalls = useCallback(
    async (searchQuery = query) => {
      queryRef.current = searchQuery;
      await loadCalls(searchQuery);
    },
    [loadCalls, query]
  );

  const updateQuery = useCallback((nextQuery) => {
    setQuery(nextQuery);
    if (!nextQuery) queryRef.current = "";
  }, []);

  const handleUploadedCall = useCallback((call) => {
    const uploadedCalls = Array.isArray(call) ? call : [call];
    if (!uploadedCalls.length) return;
    const stagedCalls = uploadedCalls.map((uploadedCall) => ({
      ...uploadedCall,
      status: "queued",
      progress: 5,
      stage: "Upload received"
    }));
    setCalls((current) => [...stagedCalls, ...current]);
    setSelectedCall(stagedCalls[0]);
    setEvents([]);

    uploadedCalls.forEach((uploadedCall) => {
      pipelineSteps.forEach((step, index) => {
        window.setTimeout(() => {
          const event = {
            id: `${uploadedCall.id}-${index}-${Date.now()}`,
            type: step.type,
            message: `[${timestamp(index)}] ${step.message}`,
            createdAt: new Date().toISOString()
          };

          setEvents((current) => [...current, event]);
          setCalls((current) =>
            current.map((item) =>
              item.id === uploadedCall.id
                ? {
                    ...item,
                    status: step.status,
                    progress: step.progress,
                    stage: step.message
                  }
                : item
            )
          );
          setSelectedCall((current) =>
            current?.id === uploadedCall.id
              ? {
                  ...current,
                  status: step.status,
                  progress: step.progress,
                  stage: step.message
                }
              : current
          );
        }, step.delay);
      });
    });
  }, []);

  const upsertCall = useCallback((nextCall) => {
    setCalls((current) => current.map((item) => (item.id === nextCall.id ? nextCall : item)));
    setSelectedCall(nextCall);
  }, []);

  const retryFailedCall = useCallback(
    async (call) => {
      if (String(call.id).startsWith("demo-")) {
        const retried = {
          ...call,
          status: "completed",
          progress: 100,
          stage: "Analysis complete after retry",
          failureReason: undefined,
          resolutionStatus: "Resolved",
          customerSentiment: "Frustrated"
        };
        upsertCall(retried);
        return;
      }
      const retried = await retryCall(call.id);
      upsertCall(retried);
      await loadCalls(queryRef.current);
    },
    [loadCalls, upsertCall]
  );

  const dismissFailedCall = useCallback(
    (call) => {
      if (String(call.id).startsWith("demo-")) {
        const hidden = JSON.parse(localStorage.getItem("hiddenDemoCalls") || "[]");
        localStorage.setItem("hiddenDemoCalls", JSON.stringify([...new Set([...hidden, call.id])]));
      }
      setCalls((current) => current.filter((item) => item.id !== call.id));
      setSelectedCall((current) => {
        if (current?.id !== call.id) return current;
        const next = calls.find((item) => item.id !== call.id);
        return next ?? null;
      });
    },
    [calls]
  );

  return {
    calls,
    events,
    query,
    selectedCall,
    setQuery: updateQuery,
    selectCall: setSelectedCall,
    searchCalls,
    handleUploadedCall,
    retryFailedCall,
    dismissFailedCall
  };
}
