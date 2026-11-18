import redis from "../../infrastructure/redis/redis-client";
import type { Job } from "../../types/jobs.types";

export const waitingQueue = "waiting_queue";
export const processingQueue = "processing_queue";

export async function addJob(job: Job) {
  await redis.rPush(waitingQueue, JSON.stringify(job));
}

export async function waitForNextJob(): Promise<Job | null> {
  const data = await redis.blMove(
    waitingQueue,
    processingQueue,
    "LEFT",
    "RIGHT",
    10,
  );

  if (!data) return null;

  const job: Job = JSON.parse(data || "") as Job;
  //   console.log(job);

  return job;
}

export async function getAllWaitingJobs() {
  const data = await redis.lRange(waitingQueue, 0, -1);

  return data;
}

export async function getAllProcessingJobs() {
  const data = await redis.lRange(processingQueue, 0, -1);

  return data;
}

export async function clearBothQueue() {
  await redis.unlink(waitingQueue);
  await redis.unlink(processingQueue);

  return true;
}

export async function acknowledgeJob(jobId: string): Promise<boolean> {
  const script = `
    local jobs = redis.call("LRANGE", KEYS[1], 0, -1)

    for _, rawJob in ipairs(jobs) do
        local success, job = pcall(cjson.decode, rawJob)

        if success and job.id == ARGV[1] then
            return redis.call("LREM", KEYS[1], 1, rawJob)
        end
    end

    return 0
  `;

  const result = await redis.sendCommand([
    "EVAL",
    script,
    "1",
    processingQueue,
    jobId,
  ]);
  return Number(result) === 1;
}

export async function updateHeartbeat(workerName: string) {
  await redis.hSet("heartbeat", workerName, Date.now().toString());
}

export async function allWorkersHeartbeat() {
  const data = await redis.hGetAll("heartbeat");

  return data;
}
