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

export const createExpense = async (req, res) => {
  try {
    const expense = await Expense.create(req.body);

    // ✅ Fire & forget (don’t wait)
    dispatchProjectCostReportUpdate({
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

    // Update expense fields
    const updatedExpense = await Expense.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    // ✅ Fire & forget command
    dispatchProjectCostReportUpdate({
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

// ✅ Delete Expense
export const deleteExpense = async (req, res) => {
  await Expense.findByIdAndDelete(req.params.id);
  dispatchProjectCostReportUpdate({
    projectId: expense.ProjectId,
    categoryId: expense.CostCategoryId,
    subcategoryId: expense.SubCategoryId,
    amount: expense.amount,
    action: "delete",
  });
  res.json({ message: "Expense deleted" });
};
