import express from "express";
import { PORT } from "./env";
import { errorMiddleware } from "./shared/middlewares/error.middleware";
import healthRouter from "./modules/health/health.routes";
import jobsRouter from "./modules/jobs/jobs.routes";
import redis from "./infrastructure/redis/redis-client";

export const app = express();

app.use(express.json());

const commonRoute = "/api/v1";

app.use(`${commonRoute}/health`, healthRouter);
app.use(`${commonRoute}/jobs`, jobsRouter);

app.use(errorMiddleware);

// console.log(await redis.ping());

app.listen(PORT, () => {
  console.log(`Server started at port  ${PORT}`);
});
