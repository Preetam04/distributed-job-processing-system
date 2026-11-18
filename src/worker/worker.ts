import { ATTEMPTS_EXHAUSTED, INVALID_JOB_TYPES } from "../errors";
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
    }, 20000);

    try {
      // it will say that the jobs is being processed
      // console.log("job fetched");

      await processJobs(job);

      await jobRepository.acknowledgeJob(job.id);

      // console.log(`Job ${job.id} completed`);
    } catch (error) {
      // console.log(error?.message || "");

      if (
        // @ts-ignore
        error?.message === ATTEMPTS_EXHAUSTED ||
        error?.message === INVALID_JOB_TYPES
      ) {
        await jobRepository.moveToDeadLetterQueue(job.id);
      }
    } finally {
      clearInterval(interval);
    }
  }
}

startWorker();
