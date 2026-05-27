import { useCallback, useEffect, useRef, useState } from "react";
import { deleteCall, getCalls, getEvents, retryCall } from "../api/callsApi.js";

const POLLING_INTERVAL_MS = 1800;

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
      return freshCalls.find((call) => call.id === current.id) ?? freshCalls[0] ?? null;
    });
  }, []);

  const loadCalls = useCallback(
    async (searchQuery = "") => {
      const [freshCalls, freshEvents] = await Promise.all([getCalls(searchQuery), getEvents()]);
      setCalls(freshCalls);
      setEvents(freshEvents);
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
    setEvents((current) => [
      ...uploadedCalls.map((uploadedCall) => ({
        id: `upload-${uploadedCall.id}-${Date.now()}`,
        type: "queued",
        message: `[${timestamp()}] upload received for ${uploadedCall.fileName ?? uploadedCall.originalName}`,
        createdAt: new Date().toISOString()
      })),
      ...current
    ]);
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

  const deleteUploadedCall = useCallback(
    async (call) => {
      await deleteCall(call.id);
      if (String(call.id).startsWith("demo-")) {
        const hidden = JSON.parse(localStorage.getItem("hiddenDemoCalls") || "[]");
        localStorage.setItem("hiddenDemoCalls", JSON.stringify([...new Set([...hidden, call.id])]));
      }

      setCalls((current) => {
        const nextCalls = current.filter((item) => item.id !== call.id);
        setSelectedCall((currentSelected) => {
          if (currentSelected?.id !== call.id) return currentSelected;
          return nextCalls[0] ?? null;
        });
        return nextCalls;
      });
      setEvents((current) => [
        {
          id: `deleted-${call.id}-${Date.now()}`,
          type: "info",
          message: `[${timestamp()}] deleted ${call.fileName ?? call.originalName}`,
          createdAt: new Date().toISOString()
        },
        ...current
      ]);
    },
    []
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
    dismissFailedCall,
    deleteUploadedCall
  };
}
