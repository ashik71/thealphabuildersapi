import express from "express";
import {
  getPaymentsByProjectId,
  createPayment,
  deletePayment
} from "../controllers/payment.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { paymentSchema } from "../validation/schemas.js";

const router = express.Router();

router.get("/:projectId", authMiddleware, adminOnly, getPaymentsByProjectId);
router.post("/", authMiddleware, adminOnly, validateBody(paymentSchema), createPayment);
router.delete("/:id", authMiddleware, adminOnly, deletePayment);

export default router;
