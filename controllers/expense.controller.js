import dotenv from "dotenv";
import Expense from "../models/expense.model.js";
import { dispatchProjectCostReportUpdate } from "../services/reportDispatcher.js";
dotenv.config();

// ✅ Get single Expense
export const getCostByCategoryId = async (req, res) => {
  const cost = await Expense.findById(req.params.id);
  if (!cost) return res.status(404).json({ message: "Not found" });
  res.json(cost);
};

// ✅ List Expenses (optionally filtered by project)
export const getExpenses = async (req, res) => {
  const filter = { IsDeleted: { $ne: true } };
  if (req.query.projectId) filter.ProjectId = req.query.projectId;
  const expenses = await Expense.find(filter)
    .populate("CostCategoryId")
    .populate("SubCategoryId")
    .sort({ Date: -1 });
  res.json(expenses);
};

export const createExpense = async (req, res) => {
  try {
    const expense = await Expense.create(req.body);

    // Await so the response only returns once the report reflects this expense
    await dispatchProjectCostReportUpdate({
      projectId: expense.ProjectId,
      categoryId: expense.CostCategoryId,
      subcategoryId: expense.SubCategoryId,
      amount: expense.Amount,
      action: "add",
    });

    return res.status(200).json({
      success: true,
      message: "Expense added successfully",
      expense,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update Expense
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const oldExpense = await Expense.findById(id);
    if (!oldExpense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });

    if (oldExpense.IsDeleted)
      return res
        .status(400)
        .json({ success: false, message: "Cannot edit a deleted expense" });

    // Update expense fields
    const updatedExpense = await Expense.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    // Await so the response only returns once the report reflects this update
    await dispatchProjectCostReportUpdate({
      oldExpense,
      newExpense: updatedExpense,
      action: "update",
    });

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Delete Expense (soft delete — preserves history for cost report reconciliation)
export const deleteExpense = async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "Expense not found" });
  if (expense.IsDeleted)
    return res.status(400).json({ message: "Expense already deleted" });

  expense.IsDeleted = true;
  expense.DeletedAt = new Date();
  await expense.save();

  await dispatchProjectCostReportUpdate({
    expense,
    action: "delete",
  });
  res.json({ message: "Expense deleted" });
};
