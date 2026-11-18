import { allWorkersHeartbeat } from "./src/modules/jobs/jobs.repository";

setInterval(async () => {
  console.log(await allWorkersHeartbeat());
}, 3000);
