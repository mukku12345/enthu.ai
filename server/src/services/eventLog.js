const events = [];

export const addEvent = ({ type = "info", message, callId, fileName }) => {
  const event = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    message,
    callId,
    fileName,
    createdAt: new Date().toISOString()
  };
  events.unshift(event);
  if (events.length > 80) events.pop();
  return event;
};

export const listEvents = () => events;
