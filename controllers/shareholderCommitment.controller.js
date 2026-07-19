import ShareholderCommitment from "../models/shareholderCommitment.model.js";

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
