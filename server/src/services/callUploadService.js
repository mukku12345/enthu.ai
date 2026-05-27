import { addEvent } from "./eventLog.js";
import { enqueueJob } from "./jobQueue.js";
import { processCall } from "./processor.js";
import { saveUploadedCallFile } from "./fileStorage.js";
import { createCall, findDuplicateCall } from "./store.js";

export const processUploadedFile = async (file) => {
  const duplicate = await findDuplicateCall({
    originalName: file.originalname,
    size: file.size
  });

  if (duplicate) {
    return {
      duplicate: true,
      call: duplicate,
      message: `${file.originalname} already exists and was skipped.`
    };
  }

  const storedFile = await saveUploadedCallFile(file);
  const call = await createCall({
    ...storedFile,
    status: "queued",
    progress: 5,
    stage: "Queued for transcription"
  });

  addEvent({
    type: "info",
    callId: call.id,
    fileName: call.originalName,
    message: `Upload received for ${call.originalName}`
  });
  addEvent({
    type: "queued",
    callId: call.id,
    fileName: call.originalName,
    message: `Job queued for ${call.originalName}`
  });
  enqueueJob(() => processCall(call.id));

  return { duplicate: false, call };
};
