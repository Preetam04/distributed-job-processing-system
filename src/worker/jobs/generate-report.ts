import { throwRetryError } from "./process-jobs";

async function generateReport(data: JSON) {
  // console.log(
  //   `Worker [${process.env.WORKER_NAME}] starting: generating Report`,
  // );
  throwRetryError();

  await new Promise((resolve, reject) => setTimeout(resolve, 500));

  console.log(`Worker [${process.env.WORKER_NAME}]: Report generated`);
}

export { generateReport };
