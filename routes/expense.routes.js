import express from "express";
import {
  getCostByCategoryId,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
} from "../controllers/expense.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { expenseSchema } from "../validation/schemas.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getExpenses);
router.get("/:costCategoryId", authMiddleware, adminOnly, getCostByCategoryId);
router.post("/", authMiddleware, adminOnly, validateBody(expenseSchema), createExpense);
router.put("/:id", authMiddleware, adminOnly, validateBody(expenseSchema.partial()), updateExpense);
router.delete("/:id", authMiddleware, adminOnly, deleteExpense);

export default router;
