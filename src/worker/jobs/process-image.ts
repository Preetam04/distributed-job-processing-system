import { markJobExecutionComplete } from "../../modules/jobs/jobs.repository";
import type { Job } from "../../types/jobs.types";
import { throwRetryError } from "./process-jobs";

async function processImage(job: Job, workerId: string) {
  // console.log("image processing is starting");
  // console.log(`Worker [${process.env.WORKER_NAME}] starting: processing Image`);

  throwRetryError();
  await new Promise((resolve, reject) => setTimeout(resolve, 500));

  await markJobExecutionComplete(job);

  console.log(`Worker [${workerId}]: Image processed`);
}

export { processImage };
