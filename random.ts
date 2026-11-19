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

// console.log(await getAllDeadLetterQueueJobs());

// console.log(Math.ceil(Math.random() * 10));

// const mpp = new Map<number, number>();

// for (let i = 0; i < 100; i++) {
//   const random = Math.ceil(Math.random() * 10);
//   mpp.set(random, mpp.getOrInsert(random, 0) + 1);
// }

// console.log(mpp);
