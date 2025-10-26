import Project from "../models/project.model.js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

export const getAllProjects = async (req, res) => {
  const projects = await Project.find();
  res.json(projects);
};

export const getProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Not found" });
  res.json(project);
};

export const createProject = async (req, res) => {
  const newProj = new Project(req.body);
  await newProj.save();
  res.status(201).json(newProj);
};

// Generate view-only link
export const generateViewLink = async (req, res) => {
  const { id } = req.params;
  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ message: "Not found" });

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + Number(process.env.VIEW_LINK_EXPIRY_MIN) * 60 * 1000);
  project.viewTokens.push({ token, expiresAt });
  await project.save();

  res.json({ url: `${process.env.FRONTEND_URL || "http://localhost:4200"}/view/${token}`, expiresAt });
};

// Validate view token
export const viewByToken = async (req, res) => {
  const { token } = req.params;
  const project = await Project.findOne({ "viewTokens.token": token });
  if (!project) return res.status(404).json({ message: "Invalid token" });

  const vt = project.viewTokens.find(v => v.token === token);
  if (new Date() > new Date(vt.expiresAt)) return res.status(410).json({ message: "Token expired" });

  res.json(project);
};
