import { markJobExecutionComplete } from "../../modules/jobs/jobs.repository";
import type { Job } from "../../types/jobs.types";
import { throwRetryError } from "./process-jobs";

async function generateReport(job: Job) {
  // console.log(
  //   `Worker [${process.env.WORKER_NAME}] starting: generating Report`,
  // );
  throwRetryError();

  await new Promise((resolve, reject) => setTimeout(resolve, 500));

  await markJobExecutionComplete(job);

  console.log(`Worker [${process.env.WORKER_NAME}]: Report generated`);
}

export { generateReport };
