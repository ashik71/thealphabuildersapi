import ShareholderCommitment from "../models/shareholderCommitment.model.js";
import Project from "../models/project.model.js";
import Payment from "../models/payment.model.js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { getFrontendUrl } from "../utils/frontendUrl.js";
dotenv.config();

// Get all commitments, optionally filtered by project
export const getCommitments = async (req, res) => {
  const filter = {};
  if (req.query.projectId) filter.ProjectId = req.query.projectId;
  const commitments = await ShareholderCommitment.find(filter).populate(
    "ShareholderId"
  );
  res.json(commitments);
};

export const createCommitment = async (req, res) => {
  try {
    const commitment = await ShareholderCommitment.create(req.body);
    res.status(201).json(commitment);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This shareholder already has a commitment on this project",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCommitment = async (req, res) => {
  const updated = await ShareholderCommitment.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: "Not found" });
  res.json(updated);
};

export const deleteCommitment = async (req, res) => {
  await ShareholderCommitment.findByIdAndDelete(req.params.id);
  res.json({ message: "Commitment deleted" });
};

// Generate a read-only share link scoped to a single shareholder's data on a single project
export const generateShareholderViewLink = async (req, res) => {
  const commitment = await ShareholderCommitment.findById(req.params.id);
  if (!commitment) return res.status(404).json({ message: "Not found" });

  let frontendUrl;
  try {
    frontendUrl = getFrontendUrl();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  const token = uuidv4();
  const expiresAt = new Date(
    Date.now() + Number(process.env.VIEW_LINK_EXPIRY_MIN) * 60 * 1000
  );
  commitment.viewTokens.push({ token, expiresAt });
  await commitment.save();

  res.json({
    url: `${frontendUrl}/shareholder-view/${token}`,
    expiresAt,
  });
};

// Public: resolve a shareholder view token to that shareholder's data on that project only
export const viewByShareholderToken = async (req, res) => {
  const { token } = req.params;
  const commitment = await ShareholderCommitment.findOne({
    "viewTokens.token": token,
  }).populate("ShareholderId");
  if (!commitment) return res.status(404).json({ message: "Invalid token" });

  const vt = commitment.viewTokens.find((v) => v.token === token);
  if (new Date() > new Date(vt.expiresAt))
    return res.status(410).json({ message: "Token expired" });

  const project = await Project.findById(commitment.ProjectId);
  if (!project) return res.status(404).json({ message: "Not found" });

  const payments = await Payment.find({
    ProjectId: commitment.ProjectId,
    ShareholderId: commitment.ShareholderId._id,
  })
    .populate("CostCategoryId")
    .populate("SubCategoryId");

  const categories = {};
  let paid = 0;
  for (const payment of payments) {
    paid += payment.AmountPaid;
    const categoryId = payment.CostCategoryId?._id?.toString() || null;
    const subCategoryId = payment.SubCategoryId?._id?.toString() || null;
    const groupKey = `${categoryId || "none"}|${subCategoryId || "none"}`;
    categories[groupKey] ??= {
      CategoryName: payment.CostCategoryId?.Name || "Uncategorized",
      SubCategoryName: payment.SubCategoryId?.Name || null,
      Amount: 0,
    };
    categories[groupKey].Amount += payment.AmountPaid;
  }

  res.json({
    ProjectName: project.Name,
    ProjectLocation: project.Location,
    ProjectStatus: project.Status,
    ShareholderName: commitment.ShareholderId.Name,
    Committed: commitment.CommittedAmount,
    Paid: paid,
    Remaining: commitment.CommittedAmount - paid,
    Categories: Object.values(categories),
  });
};
