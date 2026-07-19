import express from "express";
import { login, createUser, me } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { loginSchema, createUserSchema } from "../validation/schemas.js";

const router = express.Router();

router.post("/login", validateBody(loginSchema), login);
router.get("/me", authMiddleware, me);

// Replaces the old public POST /register — creating accounts is admin-only.
router.post(
  "/users",
  authMiddleware,
  adminOnly,
  validateBody(createUserSchema),
  createUser
);

export default router;
