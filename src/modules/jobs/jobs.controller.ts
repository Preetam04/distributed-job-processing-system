import type { NextFunction, Request, Response } from "express";
import type { Job } from "../../types/jobs.types";
import * as jobService from "./jobs.services";

async function addJob(req: Request, res: Response, next: NextFunction) {
  const data = req.body;

  await jobService.addJobs(data);

  res.status(200).json({
    message: "Job added successfully",
    statusCode: 201,
    sucess: true,
  });
}

export { addJob };
