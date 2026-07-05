import express from "express";
import {
  getAllCostCategories,
  getCostCategoryById,
  createCostCategory,
  updateCostCategory,
  deleteCostCategory
} from "../controllers/costCategory.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { z } from "zod";

const costCategorySchema = z.object({
  Name: z.string().min(1),
  ParentCategoryId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  Description: z.string().optional(),
});

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getAllCostCategories);
router.get("/:id", authMiddleware, adminOnly, getCostCategoryById);
router.post("/", authMiddleware, adminOnly, validateBody(costCategorySchema), createCostCategory);
router.put("/:id", authMiddleware, adminOnly, updateCostCategory);
router.delete("/:id", authMiddleware, adminOnly, deleteCostCategory);

export default router;
