import { ATTEMPTS_EXHAUSTED, INVALID_JOB_TYPES } from "../../errors";
import { JobType, type Job } from "../../types/jobs.types";
import { processEmail } from "./email-job";
import { generateReport } from "./generate-report";
import { processImage } from "./process-image";

export async function processJobs(job: Job) {
  // console.log(job.type === JobType.SEND_EMAIL);
  if (job.attempts >= 3) {
    console.log(`Job ${job.id} attempts exhausted`);
    throw new Error(ATTEMPTS_EXHAUSTED);
  }

  switch (job.type) {
    case JobType.SEND_EMAIL:
      await processEmail(job.payload);
      break;
    case JobType.GENERATE_REPORT:
      await generateReport(job.payload);
      break;
    case JobType.PROCESS_IMAGE:
      await processImage(job.payload);
      break;
    default:
      console.log(`Job ${job.id} type not valid`);
      throw new Error(INVALID_JOB_TYPES);
      break;
  }
}
