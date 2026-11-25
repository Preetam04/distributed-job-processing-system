import { markJobExecutionComplete } from "../../modules/jobs/jobs.repository";
import type { Job } from "../../types/jobs.types";
import { throwRetryError } from "./process-jobs";

async function processEmail(job: Job, workerId: string) {
  // console.log(`Worker [${process.env.WORKER_NAME}] starting: processing Email`);
  throwRetryError();

  await new Promise((resolve, reject) => setTimeout(resolve, 500));
  await markJobExecutionComplete(job);

  console.log(`Worker [${workerId}]: Email processed`);
}

export { processEmail };
