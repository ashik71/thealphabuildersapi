import express from "express";
import {
  getAllProjects,
  getProject,
  updateProject,
  deleteProject,
  createProject,
  generateViewLink,
  viewByToken,
} from "../controllers/project.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getAllProjects);
router.get("/:id", authMiddleware, adminOnly, getProject);
router.post("/", authMiddleware, adminOnly, createProject);
router.put("/:id", authMiddleware, adminOnly, updateProject);
router.delete("/:id", authMiddleware, adminOnly, deleteProject);
router.post("/:id/view-link", authMiddleware, adminOnly, generateViewLink);

// Public route for customers (no auth)
router.get("/view/:token", viewByToken);

export default router;
