import * as metricsServices from "./src/modules/metrics/metrics.service";

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

const metricsSnapshot = await metricsServices.getMetricsSnapshot();

console.log(metricsSnapshot);
