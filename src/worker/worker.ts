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

    try {
      // it will say that the jobs is being processed
      // console.log("job fetched");

      if (job === null) continue;

      await processJobs(job);

      await jobRepository.acknowledgeJob(job.id);

      // console.log(`Job ${job.id} completed`);
    } catch (error) {
      // @ts-ignore
      console.log(error?.message || "");
    }
  }
}

startWorker();
