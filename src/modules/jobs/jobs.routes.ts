import { Router } from "express";

import * as jobController from "./jobs.controller";

const router = Router();

router.post("/", jobController.addJob);

export default router;
