// services/reportDispatcher.js
import ProjectCostReport from "../models/projectCostReport.model.js";
import Category from "../models/costCategory.model.js";
import Project from "../models/project.model.js";

export async function dispatchProjectCostReportUpdate(payload) {
  try {
    let projectId, categoryId, subcategoryId, amountDiff = 0;

    if (payload.action === "add") {
      ({ projectId, categoryId, subcategoryId } = payload);
      amountDiff = payload.amount;

    } else if (payload.action === "update") {
      const { oldExpense, newExpense } = payload;
      projectId = newExpense.ProjectId;
      categoryId = newExpense.CostCategoryId;
      subcategoryId = newExpense.SubCategoryId;

      const oldAmount = oldExpense.Amount;
      const newAmount = newExpense.Amount;
      amountDiff = newAmount - oldAmount;

      // if category changed, adjust both sides
      if (
        !oldExpense.CostCategoryId.equals(newExpense.CostCategoryId) ||
        (oldExpense.SubCategoryId &&
          !oldExpense.SubCategoryId.equals(newExpense.SubCategoryId))
      ) {
        await updateReportTotals(oldExpense.ProjectId, oldExpense.CostCategoryId, oldExpense.SubCategoryId, -oldAmount);
        await updateReportTotals(newExpense.ProjectId, newExpense.CostCategoryId, newExpense.SubCategoryId, newAmount);
        return;
      }

    } else if (payload.action === "delete") {
      const exp = payload.expense;
      projectId = exp.ProjectId;
      categoryId = exp.CostCategoryId;
      subcategoryId = exp.SubCategoryId;
      amountDiff = -exp.Amount;
    }

    // Update report totals
    await updateReportTotals(projectId, categoryId, subcategoryId, amountDiff);

  } catch (error) {
    console.error("Error in report dispatcher:", error);
  }
}

// --- Core update logic ---
async function updateReportTotals(projectId, categoryId, subcategoryId, amountDiff) {
  const project = await Project.findById(projectId);
  const category = await Category.findById(categoryId);
  const subcategory = subcategoryId ? await Category.findById(subcategoryId) : null;

  if (!project || !category) {
    console.warn("Missing project or category. Skipping update.");
    return;
  }

  let report = await ProjectCostReport.findOne({ ProjectId: projectId });

  if (!report) {
    report = await ProjectCostReport.create({
      ProjectId: projectId,
      Summary: {
        EstimatedTotal: project.EstimatedCost || 0,
        ActualTotal: 0,
        Difference: 0,
      },
      Breakdown: [],
      GeneratedAt: new Date(),
    });
  }

  const breakdown = report.Breakdown;

  const index = breakdown.findIndex((item)=>{
    return item.CategoryId.equals(categoryId) &&
    item.SubcategoryId.equals(subcategoryId);
  })

console.log("amountDiff", amountDiff);

  if (index >= 0) {
    breakdown[index].ActualCost = Math.max(0, breakdown[index].ActualCost + amountDiff);
  } else {
    console.log("new breakdown")
    breakdown.push({
      CategoryId: categoryId,
      CategoryName: category.Name || "Unknown",
      SubcategoryId: subcategoryId || null,
      SubcategoryName: subcategory ? subcategory.Name : null,
      EstimatedCost: 0,
      ActualCost: Math.max(0, amountDiff),
    });
  }

  // Recalculate summary totals safely
  const totalActual = breakdown.reduce((sum, b) => sum + (b.ActualCost || 0), 0);
  report.Summary.ActualTotal = totalActual;
  report.Summary.Difference = (report.Summary.EstimatedTotal || 0) - totalActual;
  report.GeneratedAt = new Date();

  await report.save();
}