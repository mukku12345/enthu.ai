import { Router } from "express";
import callRoutes from "./callRoutes.js";
import eventRoutes from "./eventRoutes.js";
import healthRoutes from "./healthRoutes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/calls", callRoutes);
router.use("/events", eventRoutes);

export default router;
