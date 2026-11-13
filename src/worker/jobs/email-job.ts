async function processEmail(data: JSON) {
  console.log(`Worker [${process.env.WORKER_NAME}] starting: processing Email`);

  await new Promise((resolve, reject) => setTimeout(resolve, 500));

  console.log(`Worker [${process.env.WORKER_NAME}]: Email processed`);
}

export { processEmail };
