import ShareholderCommitment from "../models/shareholderCommitment.model.js";
import Project from "../models/project.model.js";
import Payment from "../models/payment.model.js";

/**
 * Shareholder-facing read API.
 *
 * Rules that every handler here follows:
 *  - Project queries are constrained to `req.scope.projectIds`.
 *  - Payment queries filter on BOTH ProjectId and ShareholderId, so one
 *    shareholder can never see another's payments on a shared project.
 *  - Out-of-scope ids return 404, not 403 — a 403 would confirm the project
 *    exists, which is itself a leak.
 *  - Only the caller's own figures are returned. Project totals, expenses and
 *    the shareholder roster are deliberately not exposed.
 */

const notFound = (res) => res.status(404).json({ message: "Project not found" });

// Summary across everything this shareholder has invested in.
export const getMySummary = async (req, res) => {
  const { shareholderId, projectIds } = req.scope;

  const commitments = await ShareholderCommitment.find({
    ShareholderId: shareholderId,
  }).select("ProjectId CommittedAmount");

  const payments = await Payment.find({
    ShareholderId: shareholderId,
    ProjectId: { $in: projectIds },
  }).select("AmountPaid");

  const committed = commitments.reduce((sum, c) => sum + c.CommittedAmount, 0);
  const paid = payments.reduce((sum, p) => sum + p.AmountPaid, 0);

  res.json({
    ProjectCount: commitments.length,
    Committed: committed,
    Paid: paid,
    Remaining: committed - paid,
  });
};

// The projects this shareholder funds — identity fields only, no cost data.
export const getMyProjects = async (req, res) => {
  const { shareholderId, projectIds } = req.scope;

  const [projects, commitments, payments] = await Promise.all([
    Project.find({ _id: { $in: projectIds } }).select(
      "Name Location Status StartDate EndDate"
    ),
    ShareholderCommitment.find({ ShareholderId: shareholderId }).select(
      "ProjectId CommittedAmount"
    ),
    Payment.find({
      ShareholderId: shareholderId,
      ProjectId: { $in: projectIds },
    }).select("ProjectId AmountPaid"),
  ]);

  const committedByProject = new Map();
  for (const c of commitments) {
    committedByProject.set(c.ProjectId.toString(), c.CommittedAmount);
  }

  const paidByProject = new Map();
  for (const p of payments) {
    const key = p.ProjectId.toString();
    paidByProject.set(key, (paidByProject.get(key) || 0) + p.AmountPaid);
  }

  res.json(
    projects.map((project) => {
      const key = project._id.toString();
      const committed = committedByProject.get(key) || 0;
      const paid = paidByProject.get(key) || 0;
      return {
        ProjectId: project._id,
        Name: project.Name,
        Location: project.Location,
        Status: project.Status,
        StartDate: project.StartDate,
        EndDate: project.EndDate,
        Committed: committed,
        Paid: paid,
        Remaining: committed - paid,
      };
    })
  );
};

// One project — the caller's own commitment and payment history on it.
export const getMyProjectDetail = async (req, res) => {
  const { projectId } = req.params;
  const { shareholderId } = req.scope;

  if (!req.scope.canAccessProject(projectId)) return notFound(res);

  const [project, commitment, payments] = await Promise.all([
    Project.findById(projectId).select("Name Location Summary Status StartDate EndDate"),
    ShareholderCommitment.findOne({
      ProjectId: projectId,
      ShareholderId: shareholderId,
    }),
    Payment.find({ ProjectId: projectId, ShareholderId: shareholderId })
      .populate("CostCategoryId", "Name")
      .populate("SubCategoryId", "Name")
      .sort({ Date: -1 }),
  ]);

  if (!project || !commitment) return notFound(res);

  const paid = payments.reduce((sum, p) => sum + p.AmountPaid, 0);

  res.json({
    ProjectId: project._id,
    Name: project.Name,
    Location: project.Location,
    Summary: project.Summary,
    Status: project.Status,
    StartDate: project.StartDate,
    EndDate: project.EndDate,
    Committed: commitment.CommittedAmount,
    Paid: paid,
    Remaining: commitment.CommittedAmount - paid,
    Notes: commitment.Notes,
    Payments: payments.map((p) => ({
      PaymentId: p._id,
      Amount: p.AmountPaid,
      Date: p.Date,
      CategoryName: p.CostCategoryId?.Name || null,
      SubCategoryName: p.SubCategoryId?.Name || null,
      Notes: p.Notes,
    })),
  });
};
