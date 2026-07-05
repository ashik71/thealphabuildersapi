import express from "express";
import {
  getShareholders,
  createShareholder,
  updateShareholder,
  deleteShareholder
} from "../controllers/shareholder.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { shareholderSchema } from "../validation/schemas.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getShareholders);
router.post("/", authMiddleware, adminOnly, validateBody(shareholderSchema), createShareholder);
router.put("/:id", authMiddleware, adminOnly, validateBody(shareholderSchema.partial()), updateShareholder);
router.delete("/:id", authMiddleware, adminOnly, deleteShareholder);

export default router;
