import {
  ATTEMPTS_EXHAUSTED,
  INVALID_JOB_TYPES,
  JOB_FAILED,
} from "../../errors";
import { jobExecutionComplete } from "../../modules/jobs/jobs.repository";
import { JobType, type Job } from "../../types/jobs.types";
import { processEmail } from "./email-job";
import { generateReport } from "./generate-report";
import { processImage } from "./process-image";

export async function processJobs(job: Job) {
  // console.log(job.type === JobType.SEND_EMAIL);
  if (job.attempts > 3) {
    console.log(`Job ${job.id} attempts exhausted`);
    throw new Error(ATTEMPTS_EXHAUSTED);
  }

  // job already finished execution check
  const executionFinished = await jobExecutionComplete(job.id);

  if (executionFinished) {
    console.log(`Job: ${job.id} already executed`);
    return;
  }

  switch (job.type) {
    case JobType.SEND_EMAIL:
      await processEmail(job);
      break;
    case JobType.GENERATE_REPORT:
      await generateReport(job);
      break;
    case JobType.PROCESS_IMAGE:
      await processImage(job);
      break;
    default:
      console.log(`Job ${job.id} type not valid`);
      throw new Error(INVALID_JOB_TYPES);
      break;
  }

  // console.log("Reached idempotency stop");

  // here to check idempotency
}

export function throwRetryError() {
  const random = Math.ceil(Math.random() * 10);
  if (random <= 2) throw new Error(JOB_FAILED);
  // console.log("retry job called");
}
