// Per-process concurrency limiter for outbound calls (Graph, Orion). Bursts
// of submissions otherwise fire every request at once from every PM2
// worker, which is what saturates the uplink / upstream during peaks.
// `limit(fn)` runs fn as soon as fewer than `maxConcurrent` are active,
// otherwise queues it FIFO.
export function createLimiter(maxConcurrent) {
  let active = 0;
  const queue = [];

  const next = () => {
    if (active >= maxConcurrent || queue.length === 0) return;
    active += 1;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        next();
      });
  };

  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
