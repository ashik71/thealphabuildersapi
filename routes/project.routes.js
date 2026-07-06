import express from "express";
import {
  getAllProjects,
  getProject,
  updateProject,
  deleteProject,
  createProject,
  generateViewLink,
  getProjectReport,
  getProjectFunding,
  viewByToken,
} from "../controllers/project.controller.js";
import { exportProjectReport } from "../controllers/reportExport.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { projectSchema } from "../validation/schemas.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getAllProjects);
router.get("/:id", authMiddleware, adminOnly, getProject);
router.get("/:projectId/report", authMiddleware, adminOnly, getProjectReport)
router.get("/:projectId/funding", authMiddleware, adminOnly, getProjectFunding)
router.get("/:projectId/report/export", authMiddleware, adminOnly, exportProjectReport)
router.post("/", authMiddleware, adminOnly, validateBody(projectSchema), createProject);
router.put("/:id", authMiddleware, adminOnly, validateBody(projectSchema.partial()), updateProject);
router.delete("/:id", authMiddleware, adminOnly, deleteProject);
router.post("/:id/view-link", authMiddleware, adminOnly, generateViewLink);

// Public route for customers (no auth)
router.get("/view/:token", viewByToken);

export default router;
