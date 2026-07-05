import Project from "../models/project.model.js";
import ProjectCostReport from "../models/projectCostReport.model.js"
import ShareholderCommitment from "../models/shareholderCommitment.model.js";
import Payment from "../models/payment.model.js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

export const getAllProjects = async (req, res) => {
  const projects = await Project.find();
  res.json(projects);
};

// ✅ Get single project
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

// ✅ Update project
export const updateProject = async (req, res) => {
  const updated = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updated);
};

// ✅ Delete project
export const deleteProject = async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.json({ message: "Project deleted" });
};

// GET /api/projects/:projectId/report
export const getProjectReport = async (req, res) => {
  const report = await ProjectCostReport.findOne({ ProjectId: req.params.projectId });
  res.json(report);
};


// GET /api/projects/:projectId/funding
// Per-shareholder committed vs paid vs remaining, plus project totals
export const getProjectFunding = async (req, res) => {
  const { projectId } = req.params;

  const [commitments, payments] = await Promise.all([
    ShareholderCommitment.find({ ProjectId: projectId }).populate(
      "ShareholderId"
    ),
    Payment.find({ ProjectId: projectId }),
  ]);

  const paidByShareholder = {};
  for (const payment of payments) {
    const key = payment.ShareholderId.toString();
    paidByShareholder[key] = (paidByShareholder[key] || 0) + payment.AmountPaid;
  }

  const shareholders = commitments.map((commitment) => {
    const shareholderId = commitment.ShareholderId._id.toString();
    const paid = paidByShareholder[shareholderId] || 0;
    const committed = commitment.CommittedAmount;
    delete paidByShareholder[shareholderId];
    return {
      ShareholderId: shareholderId,
      ShareholderName: commitment.ShareholderId.Name,
      Committed: committed,
      Paid: paid,
      Remaining: committed - paid,
    };
  });

  // Shareholders who paid without a recorded commitment still show up (Committed = 0)
  for (const [shareholderId, paid] of Object.entries(paidByShareholder)) {
    shareholders.push({
      ShareholderId: shareholderId,
      ShareholderName: null,
      Committed: 0,
      Paid: paid,
      Remaining: -paid,
    });
  }

  const totals = shareholders.reduce(
    (acc, s) => {
      acc.Committed += s.Committed;
      acc.Paid += s.Paid;
      acc.Remaining += s.Remaining;
      return acc;
    },
    { Committed: 0, Paid: 0, Remaining: 0 }
  );

  res.json({ ProjectId: projectId, Shareholders: shareholders, Totals: totals });
};

// Generate view-only link
export const generateViewLink = async (req, res) => {
  const { id } = req.params;
  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ message: "Not found" });

  const token = uuidv4();
  const expiresAt = new Date(
    Date.now() + Number(process.env.VIEW_LINK_EXPIRY_MIN) * 60 * 1000
  );
  project.viewTokens.push({ token, expiresAt });
  await project.save();

  res.json({
    url: `${process.env.FRONTEND_URL || "http://localhost:4200"}/view/${token}`,
    expiresAt,
  });
};

// Validate view token
export const viewByToken = async (req, res) => {
  const { token } = req.params;
  const project = await Project.findOne({ "viewTokens.token": token });
  if (!project) return res.status(404).json({ message: "Invalid token" });

  const vt = project.viewTokens.find((v) => v.token === token);
  if (new Date() > new Date(vt.expiresAt))
    return res.status(410).json({ message: "Token expired" });

  res.json(project);
};
