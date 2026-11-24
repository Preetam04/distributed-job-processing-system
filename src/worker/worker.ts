import { ATTEMPTS_EXHAUSTED, INVALID_JOB_TYPES, JOB_FAILED } from "../errors";
import redis from "../infrastructure/redis/redis-client";
import * as jobRepository from "../modules/jobs/jobs.repository";
import { processJobs } from "./jobs/process-jobs";

const workerName = process.env.WORKER_NAME;

// console.log(`Worker [${workerName}] running`);

// // console.log(await jobRepository.clearBothQueue());
// console.log(await jobRepository.getAllWaitingJobs());
// console.log(await jobRepository.getAllProcessingJobs());

async function startWorker() {
  // update heartbeat periodically
  setInterval(() => {
    // @ts-ignore
    jobRepository.updateHeartbeat(workerName);
  }, 3000);

  while (true) {
    // console.log("Worker entered");
    // get data from redis if by waiting for the data
    const job = await jobRepository.waitForNextJob();

    // check job exists
    if (job === null) continue;

    // @ts-ignore
    await jobRepository.createJobLease(job.id, workerName);

    // create job lease
    const interval = setInterval(() => {
      // @ts-ignore
      jobRepository.createJobLease(job.id, workerName).catch(console.error);
      // console.log("lease renewed");
    }, 20000);

    try {
      // it will say that the jobs is being processed
      // console.log("job fetched");

      // console.log("job started processing");

      await processJobs(job);

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
}

startWorker();
