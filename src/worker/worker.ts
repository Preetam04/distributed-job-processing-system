import * as jobRepository from "../modules/jobs/jobs.repository";
import { JobType, type Job } from "../types/jobs.types";
import { processJobs } from "./jobs/process-jobs";

const workerName = process.env.WORKER_NAME;

console.log(`Worker [${workerName}] running`);

console.log();

while (true) {
  // console.log("Worker entered");
  // get data from redis if by waiting for the data
  const data = await jobRepository.waitForNextJob();

  try {
    // console.log("data fetched");

    if (data === null) continue;
    // console.log("data validated");

    if (data.attempts >= 3) {
      console.log("Job attempts exhausted");
      continue;
    }
    // console.log("attempts validated");

    // console.log(data.type);

    await processJobs(data);
  } catch (error) {
    console.log(error?.message || "Something went wrong");
  }
}
