import express from "express";
import {
  getPaymentByProjectId,
  createPayment,
  deletePayment
} from "../controllers/payment.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/:projectId", authMiddleware, adminOnly, getPaymentByProjectId);
router.post("/", authMiddleware, adminOnly, createPayment);
router.delete("/:id", authMiddleware, adminOnly, deletePayment);

export default router;
