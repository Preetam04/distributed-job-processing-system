import redis from "../../infrastructure/redis/redis-client";
import type { Job } from "../../types/jobs.types";

export const waitingQueue = "waiting_queue";
export const processingQueue = "processing_queue";
export const deadLetterJobs = "dead_letter_jobs";

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
        redis.call("LREM", KEYS[1], 1, rawJob)
        redis.call("ZREM", KEYS[2], ARGV[1])
        return 1
      end
    end

    return 0
  `;

  const result = await redis.sendCommand([
    "EVAL",
    script,
    "2",
    processingQueue,
    "lease",
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

export async function createJobLease(jobId: string, workerName: string) {
  const leaseTimeStamp = Date.now() + 30_000;

  await redis.zAdd("lease", {
    score: leaseTimeStamp,
    value: jobId,
  });

  return;
}

// 1. Find expired lease IDs
// 2. Fetch processing jobs
// 3. Find matching jobs
// 4. Increment attempts
// 5. Add job back to queue
// 6. Remove job from processing
// 7. Remove lease
export async function recoverExpiredLeaseJobs() {
  let script = `
  local time = redis.call("TIME")

  local currentTime = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)


    local jobs = redis.call("ZRANGEBYSCORE", KEYS[1], "-inf", currentTime)
  `;

  // Redis returns all job IDs whose expiration timestamp is less than or equal to the current time.
  const expiredJobIds = await redis.zRangeByScore(
    "lease",
    "-inf",
    Date.now().toString(),
  );

  const processingJobs = await getAllProcessingJobs();

  const expiredJobs = processingJobs
    .map((rawJob) => ({
      rawJob,
      job: JSON.parse(rawJob),
    }))
    .filter(({ job }) => expiredJobIds.includes(job.id));

  for (const { rawJob, job } of expiredJobs) {
    const updatedJob = {
      ...job,
      attempts: job.attempts + 1,
    };

    if (updatedJob.attempts >= 3) {
      await moveToDeadLetterQueue(updatedJob);
    } else {
      await addJob(job);
    }

    await redis.lRem(processingQueue, 1, rawJob);
    await redis.zRem("lease", job.id);
  }

  return;
}

export async function moveToDeadLetterQueue(jobId: string) {
  const rawJobs = await getAllProcessingJobs();

  const rawJob = rawJobs.find((item) => JSON.parse(item).id === jobId);

  if (!rawJob) return false;

  const job = JSON.parse(rawJob);

  await redis.hSet(deadLetterJobs, job.id, rawJob);
  await redis.lRem(processingQueue, 1, rawJob);
  await redis.zRem("lease", job.id);

  return true;
}

export async function getAllDeadLetterQueueJobs() {
  return await redis.hGetAll(deadLetterJobs);
}

export async function retryJob(job: Job) {
  const newJob: Job = {
    ...job,
    attempts: job.attempts + 1,
  };

  await addJob(newJob);

  await redis.lRem(processingQueue, 1, JSON.stringify(job));
  await redis.zRem("lease", job.id);
}

export async function markJobExecutionComplete(job: Job) {
  await redis.set(`finished:${job.id}`, JSON.stringify(job));
}

export async function jobExecutionComplete(jobId: string): Promise<boolean> {
  const job = await redis.get(`finished:${jobId}`);

  if (job) {
    return true;
  }

  return false;
}
