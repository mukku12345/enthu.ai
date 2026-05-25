import axios from "axios";
import { buildDemoFailedCall, normalizeCallForDemo } from "../utils/demoCall.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
});

const hiddenDemoCalls = () => {
  try {
    return JSON.parse(localStorage.getItem("hiddenDemoCalls") || "[]");
  } catch {
    return [];
  }
};

export const getCalls = async (query = "") => {
  const { data } = await api.get("/calls", { params: query ? { q: query } : {} });
  const calls = data.map(normalizeCallForDemo);
  const shouldShowDemoFailed =
    !hiddenDemoCalls().includes("demo-failed-call") &&
    !calls.some((call) => call.status === "failed");
  return shouldShowDemoFailed ? [buildDemoFailedCall(), ...calls] : calls;
};

export const uploadCall = async (file) => {
  const form = new FormData();
  form.append("call", file);
  try {
    const { data } = await api.post("/calls", form);
    return { uploaded: [normalizeCallForDemo(data)], skipped: [] };
  } catch (error) {
    if (error.response?.status === 409) {
      return {
        uploaded: [],
        skipped: [{ message: error.response.data.message, call: normalizeCallForDemo(error.response.data.call) }]
      };
    }
    throw error;
  }
};

export const uploadCalls = async (files) => {
  const results = await Promise.all(files.map((file) => uploadCall(file)));
  return {
    uploaded: results.flatMap((result) => result.uploaded),
    skipped: results.flatMap((result) => result.skipped)
  };
};

export const retryCall = async (id) => {
  const { data } = await api.post(`/calls/${id}/retry`);
  return normalizeCallForDemo(data);
};
