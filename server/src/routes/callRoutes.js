import { Router } from "express";
import {
  createBulkCallUpload,
  createCallUpload,
  deleteCallRecord,
  getCallRecord,
  listCallRecords,
  retryCall
} from "../controllers/callController.js";
import { upload } from "../config/upload.js";

const router = Router();

router.get("/", listCallRecords);
router.post("/", upload.single("call"), createCallUpload);
router.post("/bulk", upload.array("calls", 100), createBulkCallUpload);
router.get("/:id", getCallRecord);
router.post("/:id/retry", retryCall);
router.delete("/:id", deleteCallRecord);

export default router;
