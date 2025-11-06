import express from "express";
import {
  getCostByCategoryId,
  createExpense,
  updateExpense,
  deleteExpense
} from "../controllers/expense.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/:costCategoryId", authMiddleware, adminOnly, getCostByCategoryId);
router.post("/", authMiddleware, adminOnly, createExpense);
router.put("/:id", authMiddleware, adminOnly, updateExpense);
router.delete("/:id", authMiddleware, adminOnly, deleteExpense);

export default router;
