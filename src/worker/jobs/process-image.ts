import type { Job } from "../../types/jobs.types";

async function processImage(data: JSON) {
  // console.log("image processing is starting");
  // console.log(`Worker [${process.env.WORKER_NAME}] starting: processing Image`);

  await new Promise((resolve, reject) => setTimeout(resolve, 500));

  console.log(`Worker [${process.env.WORKER_NAME}]: Image processed`);
}

export { processImage };
