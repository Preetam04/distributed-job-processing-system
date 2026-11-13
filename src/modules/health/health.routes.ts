import { Router } from "express";

import * as HealthContoller from "./health.controller";

const router = Router();

router.route("/").get(HealthContoller.healthCheck);
router.route("/redis").get(HealthContoller.redisCheck);

export default router;
