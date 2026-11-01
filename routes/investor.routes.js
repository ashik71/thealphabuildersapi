import express from "express";
import {
  getInvestors,
  createInvestor,
  updateInvestor,
  deleteInvestor,
  getInvestorProjects,
  createInvestorProject,
  updateInvestorProject,
  deleteInvestorProject,
} from "../controllers/investor.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { investorSchema } from "../validation/schemas.js";

const router = express.Router();
router.use(authMiddleware, adminOnly);
router.get("/", getInvestors);
router.post("/", validateBody(investorSchema), createInvestor);
router.put("/:id", validateBody(investorSchema.partial()), updateInvestor);
router.delete("/:id", deleteInvestor);
router.get("/:investorId/projects", getInvestorProjects);
router.post("/:investorId/projects", createInvestorProject);
router.put("/:investorId/projects/:assignmentId", updateInvestorProject);
router.delete("/:investorId/projects/:assignmentId", deleteInvestorProject);

export default router;
