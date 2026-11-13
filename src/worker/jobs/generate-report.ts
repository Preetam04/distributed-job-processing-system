async function generateReport(data: JSON) {
  // console.log(
  //   `Worker [${process.env.WORKER_NAME}] starting: generating Report`,
  // );

  await new Promise((resolve, reject) => setTimeout(resolve, 500));

  console.log(`Worker [${process.env.WORKER_NAME}]: Report generated`);
}

export { generateReport };
