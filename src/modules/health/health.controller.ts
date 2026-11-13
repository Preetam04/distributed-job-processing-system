import type { NextFunction, Request, Response } from "express";
import redis from "../../infrastructure/redis/redis-client";

async function healthCheck(req: Request, res: Response, next: NextFunction) {
  res.status(200).json({
    message: "Server Healthy",
    status: 200,
  });
}

async function redisCheck(req: Request, res: Response, next: NextFunction) {
  const redisResponse = await redis.ping();

  res.status(200).json({
    message: redisResponse,
    status: 200,
  });
}

export { healthCheck, redisCheck };
