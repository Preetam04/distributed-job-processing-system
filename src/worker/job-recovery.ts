import { recoverExpiredLeaseJobs } from "../modules/jobs/jobs.repository";

setInterval(async () => {
  try {
    // console.log("Recovery called");

    await recoverExpiredLeaseJobs();
  } catch (error) {
    console.error("Recovery failed:", error);
  }
}, 10000);
