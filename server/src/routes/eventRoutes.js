import { Router } from "express";
import { listEventRecords } from "../controllers/eventController.js";

const router = Router();

router.get("/", listEventRecords);

export default router;
