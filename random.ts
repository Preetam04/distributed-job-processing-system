import redis from "./src/infrastructure/redis/redis-client";
import {
  allWorkersHeartbeat,
  getAllDeadLetterQueueJobs,
  getAllProcessingJobs,
  getAllWaitingJobs,
  recoverExpiredLeaseJobs,
} from "./src/modules/jobs/jobs.repository";

// setInterval(async () => {

//   console.log(await allWorkersHeartbeat());
// }, 3000);

// console.log(await getAllWaitingJobs());
// console.log(await getAllProcessingJobs());

// await redis.unlink("dead_letter_jobs");

console.log(await getAllDeadLetterQueueJobs());
