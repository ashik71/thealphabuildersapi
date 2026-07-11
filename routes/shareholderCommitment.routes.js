import express from "express";
import {
  getCommitments,
  createCommitment,
  updateCommitment,
  deleteCommitment,
  generateShareholderViewLink,
  viewByShareholderToken,
} from "../controllers/shareholderCommitment.controller.js";
import { exportShareholderReport } from "../controllers/reportExport.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { shareholderCommitmentSchema } from "../validation/schemas.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getCommitments);
router.post("/", authMiddleware, adminOnly, validateBody(shareholderCommitmentSchema), createCommitment);
router.put("/:id", authMiddleware, adminOnly, validateBody(shareholderCommitmentSchema.partial()), updateCommitment);
router.delete("/:id", authMiddleware, adminOnly, deleteCommitment);
router.post("/:id/view-link", authMiddleware, adminOnly, generateShareholderViewLink);

// Public routes for shareholders (no auth) — scoped to their own data only
router.get("/view/:token", viewByShareholderToken);
router.get("/view/:token/report", exportShareholderReport);

export default router;
