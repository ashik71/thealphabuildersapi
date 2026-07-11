import ExcelJS from "exceljs";
import Project from "../models/project.model.js";
import ProjectCostReport from "../models/projectCostReport.model.js";
import Expense from "../models/expense.model.js";
import ShareholderCommitment from "../models/shareholderCommitment.model.js";
import Payment from "../models/payment.model.js";

function buildShareholderSummary(commitments, payments) {
  const paidByShareholder = {};
  for (const payment of payments) {
    const key = payment.ShareholderId?._id?.toString();
    if (!key) continue;
    paidByShareholder[key] = (paidByShareholder[key] || 0) + payment.AmountPaid;
  }

  const rows = commitments.map((c) => {
    const key = c.ShareholderId?._id?.toString();
    const paid = paidByShareholder[key] || 0;
    delete paidByShareholder[key];
    return {
      name: c.ShareholderId?.Name || "Unknown",
      committed: c.CommittedAmount,
      paid,
      remaining: c.CommittedAmount - paid,
    };
  });

  for (const paid of Object.values(paidByShareholder)) {
    rows.push({ name: "Unknown", committed: 0, paid, remaining: -paid });
  }

  return rows;
}

function buildShareholderCategoryBreakdown(payments) {
  const grouped = {};
  for (const payment of payments) {
    const shareholderName = payment.ShareholderId?.Name || "Unknown";
    const categoryName = payment.CostCategoryId?.Name || "Uncategorized";
    const subCategoryName = payment.SubCategoryId?.Name || "-";
    const key = `${shareholderName}|${categoryName}|${subCategoryName}`;
    grouped[key] ??= { shareholder: shareholderName, category: categoryName, subcategory: subCategoryName, amount: 0 };
    grouped[key].amount += payment.AmountPaid;
  }
  return Object.values(grouped);
}

function headerRow(sheet) {
  sheet.getRow(1).font = { bold: true };
}

export const exportProjectReport = async (req, res) => {
  const { projectId } = req.params;

  const [project, costReport, expenses, commitments, payments] = await Promise.all([
    Project.findById(projectId),
    ProjectCostReport.findOne({ ProjectId: projectId }),
    Expense.find({ ProjectId: projectId, IsDeleted: { $ne: true } })
      .populate("CostCategoryId")
      .populate("SubCategoryId")
      .sort({ Date: -1 }),
    ShareholderCommitment.find({ ProjectId: projectId }).populate("ShareholderId"),
    Payment.find({ ProjectId: projectId })
      .populate("ShareholderId")
      .populate("CostCategoryId")
      .populate("SubCategoryId"),
  ]);

  if (!project) return res.status(404).json({ message: "Project not found" });

  const shareholderRows = buildShareholderSummary(commitments, payments);
  const totalCommitted = shareholderRows.reduce((sum, r) => sum + r.committed, 0);
  const totalPaid = shareholderRows.reduce((sum, r) => sum + r.paid, 0);
  const totalRemaining = shareholderRows.reduce((sum, r) => sum + r.remaining, 0);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Alpha Builders";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 30 },
    { header: "Value", key: "value", width: 30 },
  ];
  summary.addRows([
    { field: "Project Name", value: project.Name },
    { field: "Location", value: project.Location || "-" },
    { field: "Status", value: project.Status },
    { field: "Estimated Cost", value: project.EstimatedCost || 0 },
    { field: "Actual Cost", value: costReport?.Summary?.ActualTotal || 0 },
    {
      field: "Difference",
      value: costReport?.Summary?.Difference ?? (project.EstimatedCost || 0) - (costReport?.Summary?.ActualTotal || 0),
    },
    { field: "Total Committed (Shareholders)", value: totalCommitted },
    { field: "Total Paid (Shareholders)", value: totalPaid },
    { field: "Total Remaining (Shareholders)", value: totalRemaining },
  ]);
  headerRow(summary);

  const breakdown = workbook.addWorksheet("Cost Breakdown");
  breakdown.columns = [
    { header: "Category", key: "category", width: 24 },
    { header: "Subcategory", key: "subcategory", width: 24 },
    { header: "Estimated", key: "estimated", width: 16 },
    { header: "Actual", key: "actual", width: 16 },
  ];
  (costReport?.Breakdown || []).forEach((b) =>
    breakdown.addRow({
      category: b.CategoryName,
      subcategory: b.SubcategoryName || "-",
      estimated: b.EstimatedCost || 0,
      actual: b.ActualCost || 0,
    })
  );
  headerRow(breakdown);

  const expenseSheet = workbook.addWorksheet("Expenses");
  expenseSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Category", key: "category", width: 20 },
    { header: "Subcategory", key: "subcategory", width: 20 },
    { header: "Description", key: "description", width: 28 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Paid To", key: "paidTo", width: 20 },
    { header: "Notes", key: "notes", width: 28 },
  ];
  expenses.forEach((e) =>
    expenseSheet.addRow({
      date: e.Date ? new Date(e.Date).toISOString().slice(0, 10) : "-",
      category: e.CostCategoryId?.Name || "-",
      subcategory: e.SubCategoryId?.Name || "-",
      description: e.Description || "-",
      amount: e.Amount,
      paidTo: e.PaidTo || "-",
      notes: e.Notes || "-",
    })
  );
  headerRow(expenseSheet);

  const commitSheet = workbook.addWorksheet("Commitments");
  commitSheet.columns = [
    { header: "Shareholder", key: "shareholder", width: 24 },
    { header: "Committed Amount", key: "amount", width: 18 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  commitments.forEach((c) =>
    commitSheet.addRow({ shareholder: c.ShareholderId?.Name || "Unknown", amount: c.CommittedAmount, notes: c.Notes || "-" })
  );
  headerRow(commitSheet);

  const paymentSheet = workbook.addWorksheet("Payments");
  paymentSheet.columns = [
    { header: "Shareholder", key: "shareholder", width: 24 },
    { header: "Category", key: "category", width: 20 },
    { header: "Subcategory", key: "subcategory", width: 20 },
    { header: "Amount Paid", key: "amount", width: 16 },
    { header: "Date", key: "date", width: 14 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  payments.forEach((p) =>
    paymentSheet.addRow({
      shareholder: p.ShareholderId?.Name || "Unknown",
      category: p.CostCategoryId?.Name || "-",
      subcategory: p.SubCategoryId?.Name || "-",
      amount: p.AmountPaid,
      date: p.Date ? new Date(p.Date).toISOString().slice(0, 10) : "-",
      notes: p.Notes || "-",
    })
  );
  headerRow(paymentSheet);

  const shCategorySheet = workbook.addWorksheet("Shareholder Category Breakdown");
  shCategorySheet.columns = [
    { header: "Shareholder", key: "shareholder", width: 24 },
    { header: "Category", key: "category", width: 20 },
    { header: "Subcategory", key: "subcategory", width: 20 },
    { header: "Amount Paid", key: "amount", width: 16 },
  ];
  buildShareholderCategoryBreakdown(payments).forEach((r) => shCategorySheet.addRow(r));
  headerRow(shCategorySheet);

  const shSummary = workbook.addWorksheet("Shareholder Summary");
  shSummary.columns = [
    { header: "Shareholder", key: "name", width: 24 },
    { header: "Committed", key: "committed", width: 16 },
    { header: "Paid", key: "paid", width: 16 },
    { header: "Remaining", key: "remaining", width: 16 },
  ];
  shareholderRows.forEach((r) => shSummary.addRow(r));
  headerRow(shSummary);

  const safeName = (project.Name || "project").replace(/[^a-z0-9]+/gi, "_");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}_report.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
};

// Public: export a single shareholder's own data for a project, resolved via their share-link token.
// Scoped identically to viewByShareholderToken — never touches other shareholders' commitments/payments.
export const exportShareholderReport = async (req, res) => {
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
    .populate("SubCategoryId")
    .sort({ Date: -1 });

  const paid = payments.reduce((sum, p) => sum + p.AmountPaid, 0);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Alpha Builders";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 30 },
    { header: "Value", key: "value", width: 30 },
  ];
  summary.addRows([
    { field: "Project Name", value: project.Name },
    { field: "Location", value: project.Location || "-" },
    { field: "Status", value: project.Status },
    { field: "Shareholder", value: commitment.ShareholderId.Name },
    { field: "Committed", value: commitment.CommittedAmount },
    { field: "Paid", value: paid },
    { field: "Remaining", value: commitment.CommittedAmount - paid },
  ]);
  headerRow(summary);

  const paymentSheet = workbook.addWorksheet("Payments");
  paymentSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Category", key: "category", width: 20 },
    { header: "Subcategory", key: "subcategory", width: 20 },
    { header: "Amount Paid", key: "amount", width: 16 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  payments.forEach((p) =>
    paymentSheet.addRow({
      date: p.Date ? new Date(p.Date).toISOString().slice(0, 10) : "-",
      category: p.CostCategoryId?.Name || "-",
      subcategory: p.SubCategoryId?.Name || "-",
      amount: p.AmountPaid,
      notes: p.Notes || "-",
    })
  );
  headerRow(paymentSheet);

  const safeName = `${project.Name || "project"}_${commitment.ShareholderId.Name || "shareholder"}`.replace(
    /[^a-z0-9]+/gi,
    "_"
  );
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}_report.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
};
