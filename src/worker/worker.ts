import { ATTEMPTS_EXHAUSTED, INVALID_JOB_TYPES, JOB_FAILED } from "../errors";
import redis from "../infrastructure/redis/redis-client";
import * as jobRepository from "../modules/jobs/jobs.repository";
import { processJobs } from "./jobs/process-jobs";

const workerId = crypto.randomUUID();
console.log(workerId);

// Gracefull shutdown
let isShuttingDown = false;

const handleShutdown = () => {
  if (isShuttingDown) return;

  console.log("Worker shutting down...");
  isShuttingDown = true;
};

process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);

// console.log(`Worker [${workerName}] running`);

// // console.log(await jobRepository.clearBothQueue());
// console.log(await jobRepository.getAllWaitingJobs());
// console.log(await jobRepository.getAllProcessingJobs());

async function startWorker() {
  // update heartbeat periodically

  const heartbeatInterval = setInterval(async () => {
    // @ts-ignore
    jobRepository
      .updateHeartbeat(workerId)
      .catch((error) => console.log(error));
    // console.log(heartbeat);
  }, 3000);

  try {
    while (!isShuttingDown) {
      // console.log("Worker entered");
      // get data from redis if by waiting for the data
      const job = await jobRepository.waitForNextJob();

      if (isShuttingDown && job === null) break;

      if (job === null) continue;

      // @ts-ignore
      await jobRepository.createJobLease(job.id, workerId);

      // create job lease
      const interval = setInterval(() => {
        // @ts-ignore
        jobRepository.createJobLease(job.id, workerId).catch(console.error);
        // console.log("lease renewed");
      }, 20000);

      try {
        // it will say that the jobs is being processed
        // console.log("job fetched");

        // console.log("job started processing");

        await processJobs(job, workerId);

        await jobRepository.acknowledgeJob(job.id);

        // console.log(`Job ${job.id} completed`);
      } catch (error) {
        // console.log(error?.message || "");

        if (
          error?.message === ATTEMPTS_EXHAUSTED ||
          error?.message === INVALID_JOB_TYPES
        ) {
          await jobRepository.moveToDeadLetterQueue(job.id);
        } else if (error?.message === JOB_FAILED) {
          // console.log(job);

          console.log("retry job called : " + job.attempts);
          await jobRepository.retryJob(job);
        } else {
          console.error("Unexpected job processing error:", error);
        }
      } finally {
        clearInterval(interval);
      }
    }
  } finally {
    clearInterval(heartbeatInterval);
    await redis.quit();
  }
}

startWorker().catch((error) => {
  console.error("Worker crashed:", error);
  process.exitCode = 1;
});
