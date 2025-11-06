import express from "express";
import {
  getCostByProjectId,
  createCostCategory,
  updateCostCategory,
  deleteCostCategory
} from "../controllers/costCategory.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/:projectId", authMiddleware, adminOnly, getCostByProjectId);
router.post("/", authMiddleware, adminOnly, createCostCategory);
router.put("/:id", authMiddleware, adminOnly, updateCostCategory);
router.delete("/:id", authMiddleware, adminOnly, deleteCostCategory);

export default router;
