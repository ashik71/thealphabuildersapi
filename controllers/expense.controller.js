import dotenv from "dotenv";
import Expense from "../models/expense.model.js";
import ExpenseShare from "../models/expenseShare.model.js";
import ShareholderCommitment from "../models/shareholderCommitment.model.js";
import Payment from "../models/payment.model.js";
import { dispatchProjectCostReportUpdate } from "../services/reportDispatcher.js";
dotenv.config();

// Splits `amount` into `count` shares of 2-decimal money, summing back to
// `amount` exactly — every share gets floor(amount/count * 100)/100, and
// leftover cents (there are at most count-1 of them) go to the first shares.
function splitEqually(amount, count) {
  const totalCents = Math.round(amount * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;
  return Array.from({ length: count }, (_, i) => {
    const cents = baseCents + (i < remainder ? 1 : 0);
    return cents / 100;
  });
}

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
    const { SplitAmongShareholders, MarkSharesPaid, ...expenseFields } = req.body;

    let commitments = [];
    if (SplitAmongShareholders) {
      commitments = await ShareholderCommitment.find({ ProjectId: expenseFields.ProjectId });
      if (commitments.length === 0) {
        return res.status(400).json({
          success: false,
          message: "This project has no shareholders to split the expense among",
        });
      }
    }

    const expense = await Expense.create(expenseFields);

    // Await so the response only returns once the report reflects this expense
    await dispatchProjectCostReportUpdate({
      projectId: expense.ProjectId,
      categoryId: expense.CostCategoryId,
      subcategoryId: expense.SubCategoryId,
      amount: expense.Amount,
      action: "add",
    });

    let shares = [];
    if (SplitAmongShareholders) {
      const amounts = splitEqually(expense.Amount, commitments.length);

      shares = await Promise.all(
        commitments.map(async (commitment, i) => {
          const shareAmount = amounts[i];

          // Grows what this shareholder is on the hook for, so Remaining
          // (Committed - Paid) in the funding report stays accurate whether
          // or not this share is marked paid below.
          commitment.CommittedAmount += shareAmount;
          await commitment.save();

          let paymentId = null;
          if (MarkSharesPaid) {
            const payment = await Payment.create({
              ProjectId: expense.ProjectId,
              ShareholderId: commitment.ShareholderId,
              CostCategoryId: expense.CostCategoryId,
              SubCategoryId: expense.SubCategoryId,
              AmountPaid: shareAmount,
              Date: expense.Date,
              Notes: `Auto-recorded: share of expense "${expense.Description || expense._id}"`,
            });
            paymentId = payment._id;
          }

          return ExpenseShare.create({
            ExpenseId: expense._id,
            ProjectId: expense.ProjectId,
            ShareholderId: commitment.ShareholderId,
            Amount: shareAmount,
            Paid: !!MarkSharesPaid,
            PaymentId: paymentId,
          });
        })
      );
    }

    return res.status(200).json({
      success: true,
      message: "Expense added successfully",
      expense,
      shares,
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
