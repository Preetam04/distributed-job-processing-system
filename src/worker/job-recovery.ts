import { recoverExpiredLeaseJobs } from "../modules/jobs/jobs.repository";

setInterval(async () => {
  try {
    await recoverExpiredLeaseJobs();
  } catch (error) {
    console.error("Recovery failed:", error);
  }
}, 10000);
