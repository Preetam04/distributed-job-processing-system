import type { Job } from "../../types/jobs.types";
import * as jobRepository from "./jobs.repository";

export async function addJobs(data: Job) {
  console.log("Validating the payload");
  await new Promise((resolve, reject) => setTimeout(resolve, 200));
  console.log("Payload Validation successfull");

  const job: Job = {
    id: crypto.randomUUID(),
    payload: data.payload || {},
    attempts: 0,
    type: data.type,
  };

  await jobRepository.addJob(job);
}
