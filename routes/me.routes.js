import express from "express";
import {
  getMySummary,
  getMyProjects,
  getMyProjectDetail,
} from "../controllers/me.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { shareholderOnly } from "../middleware/role.middleware.js";
import { shareholderScope } from "../middleware/shareholderScope.js";

const router = express.Router();

// Applied to the whole router so a future endpoint added here cannot
// accidentally be left unscoped.
router.use(authMiddleware, shareholderOnly, shareholderScope);

router.get("/summary", getMySummary);
router.get("/projects", getMyProjects);
router.get("/projects/:projectId", getMyProjectDetail);

export default router;
