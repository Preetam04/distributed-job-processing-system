import redis from "../../infrastructure/redis/redis-client";
import {
  deadLetterJobs,
  jobs_completed,
  jobs_dead_lettered,
  jobs_enqueued,
  jobs_failed,
  jobs_recovered,
  jobs_retried,
  lease,
  metrics,
  processingQueue,
  waitingQueue,
} from "../../shared/utils/queues";
import type { Job } from "../../types/jobs.types";
import * as metricsServices from "./../metrics/metrics.service";

export async function addJob(job: Job) {
  await redis.rPush(waitingQueue, JSON.stringify(job));
  await metricsServices.incrementCounter(jobs_enqueued);
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
        redis.call("HINCRBY", KEYS[3] , KEYS[4] , 1)
        return 1
      end
    end

    return 0
  `;

  const result = await redis.sendCommand([
    "EVAL",
    script,
    "4",
    processingQueue,
    lease,
    metrics,
    jobs_completed,
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

  await redis.zAdd(lease, {
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
  const script = `
    local function getCurrentTime()
      local time = redis.call("TIME")

      return (tonumber(time[1]) * 1000)
        + math.floor(tonumber(time[2]) / 1000)
    end

    local currentTime = getCurrentTime()

    -- 1. Get expired lease IDs
    local expiredJobIds = redis.call(
      "ZRANGEBYSCORE",
      KEYS[1],
      "-inf",
      currentTime
    )

    -- 2. Get jobs currently being processed
    local processingJobs = redis.call(
      "LRANGE",
      KEYS[2],
      0,
      -1
    )

    local expiredJobs = {}
    local matchedJobIds = {}

    -- 3. Match expired lease IDs with processing jobs
    for _, jobId in ipairs(expiredJobIds) do
      for _, rawJob in ipairs(processingJobs) do
        local job = cjson.decode(rawJob)

        if job.id == jobId then
          job.attempts = job.attempts + 1

          local updatedJob = cjson.encode(job)

          table.insert(expiredJobs, {
            rawJob = rawJob,
            updatedJob = updatedJob,
            id = job.id,
            attempts = job.attempts
          })

          matchedJobIds[jobId] = true
          break
        end
      end
    end

    local recoveredCount = 0
    local deadLetterCount = 0
    local staleLeaseCount = 0

    -- 4. Revalidate leases and recover jobs
    for _, entry in ipairs(expiredJobs) do
      local lease = redis.call(
        "ZSCORE",
        KEYS[1],
        entry.id
      )

      if lease and tonumber(lease) <= currentTime then

        redis.call("HINCRBY", KEYS[5] , KEYS[8] , 1)


        if entry.attempts <= 3 then
          redis.call(
            "RPUSH",
            KEYS[3],
            entry.updatedJob
          )

          
          redis.call("HINCRBY", KEYS[5] , KEYS[6] , 1)

          recoveredCount = recoveredCount + 1
        else
          redis.call(
            "HSET",
            KEYS[4],
            entry.id,
            entry.updatedJob
          )

          redis.call("HINCRBY", KEYS[5] , KEYS[7] , 1)

          deadLetterCount = deadLetterCount + 1
        end

        redis.call(
          "LREM",
          KEYS[2],
          1,
          entry.rawJob
        )

        redis.call(
          "ZREM",
          KEYS[1],
          entry.id
        )
      end
    end

    -- 5. Remove expired leases with no processing job
    for _, jobId in ipairs(expiredJobIds) do
      if not matchedJobIds[jobId] then
        local lease = redis.call(
          "ZSCORE",
          KEYS[1],
          jobId
        )

        if lease and tonumber(lease) <= currentTime then
          redis.call("ZREM", KEYS[1], jobId)
          staleLeaseCount = staleLeaseCount + 1
        end
      end
    end

    return {
      recoveredCount,
      deadLetterCount,
      staleLeaseCount
    }
  `;

  const result = await redis.sendCommand([
    "EVAL",
    script,
    "8",
    lease,
    processingQueue,
    waitingQueue,
    deadLetterJobs,
    metrics,
    jobs_retried,
    jobs_dead_lettered,
    jobs_recovered,
  ]);

  return result;

  // Redis returns all job IDs whose expiration timestamp is less than or equal to the current time.
  // const expiredJobIds = await redis.zRangeByScore(
  //   lease,
  //   "-inf",
  //   Date.now().toString(),
  // );

  // const processingJobs = await getAllProcessingJobs();

  // const expiredJobs = processingJobs
  //   .map((rawJob) => ({
  //     rawJob,
  //     job: JSON.parse(rawJob),
  //   }))
  //   .filter(({ job }) => expiredJobIds.includes(job.id));

  // for (const { rawJob, job } of expiredJobs) {
  //   const updatedJob = {
  //     ...job,
  //     attempts: job.attempts + 1,
  //   };

  //   if (updatedJob.attempts >= 3) {
  //     await moveToDeadLetterQueue(updatedJob);
  //   } else {
  //     await addJob(job);
  //   }

  //   await redis.lRem(processingQueue, 1, rawJob);
  //   await redis.zRem(lease, job.id);
  // }

  // return;
}

export async function moveToDeadLetterQueue(jobId: string) {
  // console.log("asdasd");

  let script = `
    local allProcessingJobs = redis.call("LRANGE", KEYS[1], 0,-1)

    for _, rawJob in ipairs(allProcessingJobs) do
      local success, job = pcall(cjson.decode, rawJob)

      if success and job.id == ARGV[1] then
        redis.call("HSET", KEYS[2], job.id, rawJob)
        redis.call("LREM", KEYS[1], 1, rawJob)
        redis.call("ZREM", KEYS[3], job.id);
        redis.call("HINCRBY", KEYS[4] , KEYS[5] , 1)
        return 1
      end
    end

    return 0
  `;

  const result = await redis.sendCommand([
    "EVAL",
    script,
    "5",
    processingQueue,
    deadLetterJobs,
    lease,
    metrics,
    jobs_dead_lettered,
    jobId,
  ]);

  // console.log(result);

  return Number(result) === 1;

  // const rawJobs = await getAllProcessingJobs();

  // const rawJob = rawJobs.find((item) => JSON.parse(item).id === jobId);

  // if (!rawJob) return false;

  // const job = JSON.parse(rawJob);

  // await redis.hSet(deadLetterJobs, job.id, rawJob);
  // await redis.lRem(processingQueue, 1, rawJob);
  // await redis.zRem(lease, job.id);

  // return true;
}

export async function getAllDeadLetterQueueJobs() {
  return await redis.hGetAll(deadLetterJobs);
}

export async function retryJob(job: Job) {
  // console.log(job);
  let script = `

    redis.call("HINCRBY", KEYS[5], KEYS[8], 1)

    local job = cjson.decode(ARGV[1])

    if type(job.attempts) ~= "number" then
      return redis.error_reply("Invalid job: attempts must be a number")
    end


    local newJob = job;
    newJob.attempts = newJob.attempts + 1


    local updatedJob = cjson.encode(newJob)

    local removed = redis.call("LREM", KEYS[2], 1, ARGV[1])

    if removed == 0 then
        return 0
    end

    if newJob.attempts <= 3 then

      redis.call("RPUSH", KEYS[3], updatedJob)
      redis.call("HINCRBY", KEYS[5] , KEYS[6] , 1)
    else 
      redis.call("HSET", KEYS[4], newJob.id, updatedJob)
      redis.call("HINCRBY", KEYS[5] ,KEYS[7], 1)
      
    end


    redis.call("ZREM", KEYS[1], job.id)
    
    return 1
  `;

  const result = await redis.sendCommand([
    "EVAL",
    script,
    "8",
    lease,
    processingQueue,
    waitingQueue,
    deadLetterJobs,
    metrics,
    jobs_retried,
    jobs_dead_lettered,
    jobs_failed,
    JSON.stringify(job),
  ]);

  // await metricsServices.incrementCounter(jobs_retried);
  return Number(result) === 1;

  const newJob: Job = {
    ...job,
    attempts: job.attempts + 1,
  };

  if (newJob.attempts <= 3) {
    await addJob(newJob);
  } else {
    await moveToDeadLetterQueue(newJob.id);
  }

  await redis.lRem(processingQueue, 1, JSON.stringify(job));
  await redis.zRem(lease, job.id);
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
