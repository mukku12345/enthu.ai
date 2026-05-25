import { addEvent } from "./eventLog.js";

export const notifyFailure = async (call, reason) => {
  const text = `Call processing failed for "${call.originalName}" (${call.id}). Reason: ${reason}`;

  if (!process.env.SLACK_WEBHOOK_URL) {
    console.warn(`[notification:fallback] ${text}`);
    addEvent({
      type: "failure",
      callId: call.id,
      fileName: call.originalName,
      message: `Slack alert sent to QA ops: Transcription failed for call ${call.originalName}. ${reason}`
    });
    return;
  }

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    addEvent({
      type: "failure",
      callId: call.id,
      fileName: call.originalName,
      message: `Slack alert sent to QA ops: Transcription failed for call ${call.originalName}. ${reason}`
    });
  } catch (error) {
    console.error("Unable to send Slack failure notification", error);
    addEvent({
      type: "failure",
      callId: call.id,
      fileName: call.originalName,
      message: `Slack alert simulated after notification send failed: ${call.originalName}. ${reason}`
    });
  }
};
