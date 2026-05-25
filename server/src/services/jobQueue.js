const concurrency = Number(process.env.PROCESSING_CONCURRENCY || 2);
const queue = [];
let running = 0;

const runNext = () => {
  if (running >= concurrency || queue.length === 0) return;

  const job = queue.shift();
  running += 1;

  Promise.resolve(job())
    .catch((error) => console.error("Queued job failed", error))
    .finally(() => {
      running -= 1;
      runNext();
    });
};

export const enqueueJob = (job) => {
  queue.push(job);
  runNext();
};

export const getQueueStats = () => ({
  waiting: queue.length,
  running,
  concurrency
});
