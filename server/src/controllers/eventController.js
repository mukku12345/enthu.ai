import { listEvents } from "../services/eventLog.js";

export const listEventRecords = (_req, res) => {
  res.json(listEvents());
};
