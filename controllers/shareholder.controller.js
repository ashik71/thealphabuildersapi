import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import Shareholder from "../models/shareholder.model.js";
import ShareholderCommitment from "../models/shareholderCommitment.model.js";
import Payment from "../models/payment.model.js";
dotenv.config();

// ✅ Get single Shareholder
export const getShareholders = async (req, res) => {
  const [shareholders, commitments, payments] = await Promise.all([
    Shareholder.find(),
    ShareholderCommitment.find().populate("ProjectId", "Name"),
    Payment.find().populate("ProjectId", "Name"),
  ]);
  if (!shareholders) return res.status(404).json({ message: "Not found" });

  const projectsByShareholder = {};
  const addProject = (shareholderId, project) => {
    if (!project) return;
    const key = shareholderId.toString();
    projectsByShareholder[key] ??= new Map();
    projectsByShareholder[key].set(project._id.toString(), project.Name);
  };
  for (const c of commitments) addProject(c.ShareholderId, c.ProjectId);
  for (const p of payments) addProject(p.ShareholderId, p.ProjectId);

  const result = shareholders.map((s) => {
    const projectMap = projectsByShareholder[s._id.toString()];
    const Projects = projectMap
      ? Array.from(projectMap, ([ProjectId, ProjectName]) => ({ ProjectId, ProjectName }))
      : [];
    return { ...s.toObject(), Projects };
  });

  res.json(result);
};

export const createShareholder = async (req, res) => {
  const newShareholder = new Shareholder(req.body);
  await newShareholder.save();
  res.status(201).json(newShareholder);
};

// ✅ Update Shareholder
export const updateShareholder = async (req, res) => {
  const updated = await Shareholder.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updated);
};

// ✅ Delete Shareholder
export const deleteShareholder = async (req, res) => {
  await Shareholder.findByIdAndDelete(req.params.id);
  res.json({ message: "Shareholder deleted" });
};