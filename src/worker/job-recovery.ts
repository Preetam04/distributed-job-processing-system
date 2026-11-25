import redis from "../infrastructure/redis/redis-client";
import { recoverExpiredLeaseJobs } from "../modules/jobs/jobs.repository";

// Gracefull shutdown
let isShuttingDown = false;

let shutdownTimer: ReturnType<typeof setTimeout> | undefined;
let resolveWait: (() => void) | undefined;

const waitForNextCycle = () =>
  new Promise<void>((resolve) => {
    resolveWait = resolve;

    shutdownTimer = setTimeout(() => {
      resolveWait = undefined;
      shutdownTimer = undefined;
      resolve();
    }, 10000);
  });

const handleShutdown = () => {
  if (isShuttingDown) return;

  console.log("Worker shutting down...");
  isShuttingDown = true;

  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = undefined;
  }

  resolveWait?.();
  resolveWait = undefined;
};

process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);

async function recovery() {
  try {
    while (!isShuttingDown) {
      try {
        await recoverExpiredLeaseJobs();
      } catch (error) {
        console.log(error);
      }
      if (isShuttingDown) break;

      await waitForNextCycle();
    }
  } finally {
    console.log("Closing recovery service...");
    await redis.quit();
  }
}

recovery().catch((error) => {
  console.error("Recovery service crashed:", error);
  process.exitCode = 1;
});
