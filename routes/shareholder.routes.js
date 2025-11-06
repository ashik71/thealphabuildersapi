import express from "express";
import {
  getShareholders,
  createShareholder,
  updateShareholder,
  deleteShareholder
} from "../controllers/shareholder.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getShareholders);
router.post("/", authMiddleware, adminOnly, createShareholder);
router.put("/:id", authMiddleware, adminOnly, updateShareholder);
router.delete("/:id", authMiddleware, adminOnly, deleteShareholder);

export default router;
