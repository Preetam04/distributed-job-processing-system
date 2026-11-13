import redis from "../../infrastructure/redis/redis-client";
import type { Job } from "../../types/jobs.types";

const queue = "myQueue";

export async function addJob(job: Job) {
  await redis.rPush(queue, JSON.stringify(job));
}

export async function waitForNextJob(): Promise<Job | null> {
  const data = await redis.blPop(queue, 5);

  if (!data) return null;

  const job: Job = JSON.parse(data?.element || "") as Job;
  //   console.log(job);

  return job;
}
