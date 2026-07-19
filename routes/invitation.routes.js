import express from "express";
import {
  createInvitation,
  getInvitations,
  revokeInvitation,
  getInvitation,
  acceptInvitation,
} from "../controllers/invitation.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  createInvitationSchema,
  acceptInvitationSchema,
} from "../validation/schemas.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getInvitations);
router.post(
  "/",
  authMiddleware,
  adminOnly,
  validateBody(createInvitationSchema),
  createInvitation
);
router.post("/:id/revoke", authMiddleware, adminOnly, revokeInvitation);

// Public — the invitee has no account yet. Both are gated by a single-use,
// expiring, hashed token rather than by auth.
router.get("/token/:token", getInvitation);
router.post(
  "/token/:token/accept",
  validateBody(acceptInvitationSchema),
  acceptInvitation
);

export default router;
