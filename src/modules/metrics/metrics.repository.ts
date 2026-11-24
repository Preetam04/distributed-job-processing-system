import redis from "../../infrastructure/redis/redis-client";
import {
  deadLetterJobs,
  processingQueue,
  waitingQueue,
} from "../../shared/utils/queues";

async function incrementCounter(type: string) {
  return await redis.hIncrBy("metrics", type, 1);
}

async function getAllMetrics() {
  return await redis.hGetAll("metrics");
}

async function getQueueDepths() {
  const data = {
    waiting: await redis.lLen(waitingQueue),
    processing: await redis.lLen(processingQueue),
    dead_letter: await redis.hLen(deadLetterJobs),
  };

  return data;
}

async function getAllWorkersHeartbeat() {
  const data = await redis.hGetAll("heartbeat");

  return data;
}

export {
  incrementCounter,
  getAllMetrics,
  getQueueDepths,
  getAllWorkersHeartbeat,
};
