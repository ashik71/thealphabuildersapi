import express from "express";
import {
  getCommitments,
  createCommitment,
  updateCommitment,
  deleteCommitment,
} from "../controllers/shareholderCommitment.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { shareholderCommitmentSchema } from "../validation/schemas.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getCommitments);
router.post("/", authMiddleware, adminOnly, validateBody(shareholderCommitmentSchema), createCommitment);
router.put("/:id", authMiddleware, adminOnly, validateBody(shareholderCommitmentSchema.partial()), updateCommitment);
router.delete("/:id", authMiddleware, adminOnly, deleteCommitment);

// The unauthenticated shareholder view-link endpoints were removed — the
// shareholder portal (/api/me) serves the same data behind a real account.

export default router;
