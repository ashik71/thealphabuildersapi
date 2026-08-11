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

// Undoes a previously-applied split: un-bumps each ExpenseShare's
// CommittedAmount, deletes any Payment it generated, then deletes the
// ExpenseShare records themselves. Used before re-splitting on edit, and on
// delete. Safe to call on an expense with no shares (no-op).
async function reverseSplit(expenseId) {
  const shares = await ExpenseShare.find({ ExpenseId: expenseId });
  if (shares.length === 0) return;

  const paymentIds = shares.filter((s) => s.PaymentId).map((s) => s.PaymentId);
  await Promise.all([
    ...shares.map(async (share) => {
      await ShareholderCommitment.updateOne(
        { ProjectId: share.ProjectId, ShareholderId: share.ShareholderId },
        { $inc: { CommittedAmount: -share.Amount } }
      );
    }),
    paymentIds.length > 0 ? Payment.deleteMany({ _id: { $in: paymentIds } }) : Promise.resolve(),
  ]);
  await ExpenseShare.deleteMany({ ExpenseId: expenseId });
}

// Applies a fresh equal split of `expense.Amount` across every shareholder
// committed to `expense.ProjectId`. Returns the created ExpenseShare docs.
// Throws if the project has no shareholder commitments — callers translate
// that into a 400.
async function applySplit(expense, markPaid) {
  const commitments = await ShareholderCommitment.find({ ProjectId: expense.ProjectId });
  if (commitments.length === 0) {
    throw Object.assign(new Error("This project has no shareholders to split the expense among"), {
      statusCode: 400,
    });
  }

  const amounts = splitEqually(expense.Amount, commitments.length);

  return Promise.all(
    commitments.map(async (commitment, i) => {
      const shareAmount = amounts[i];

      // Grows what this shareholder is on the hook for, so Remaining
      // (Committed - Paid) in the funding report stays accurate whether or
      // not this share is marked paid below.
      commitment.CommittedAmount += shareAmount;
      await commitment.save();

      let paymentId = null;
      if (markPaid) {
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
        Paid: !!markPaid,
        PaymentId: paymentId,
      });
    })
  );
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

  const shares = await ExpenseShare.find({
    ExpenseId: { $in: expenses.map((e) => e._id) },
  });
  const sharesByExpense = new Map();
  for (const share of shares) {
    const key = share.ExpenseId.toString();
    sharesByExpense.set(key, [...(sharesByExpense.get(key) || []), share]);
  }

  const result = expenses.map((e) => {
    const expenseShares = sharesByExpense.get(e._id.toString()) || [];
    return {
      ...e.toObject(),
      HasShares: expenseShares.length > 0,
      SharesArePaid: expenseShares.length > 0 && expenseShares.every((s) => s.Paid),
    };
  });

  res.json(result);
};

export const createExpense = async (req, res) => {
  try {
    const { SplitAmongShareholders, MarkSharesPaid, ...expenseFields } = req.body;

    // Validate the split is possible before creating anything, so a project
    // with no shareholders never ends up with an orphaned Expense.
    if (SplitAmongShareholders) {
      const count = await ShareholderCommitment.countDocuments({ ProjectId: expenseFields.ProjectId });
      if (count === 0) {
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

    const shares = SplitAmongShareholders ? await applySplit(expense, MarkSharesPaid) : [];

    return res.status(200).json({
      success: true,
      message: "Expense added successfully",
      expense,
      shares,
    });
  } catch (err) {
    console.error(err);
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

// ✅ Update Expense
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { SplitAmongShareholders, MarkSharesPaid, ...expenseFields } = req.body;

    const oldExpense = await Expense.findById(id);
    if (!oldExpense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });

    if (oldExpense.IsDeleted)
      return res
        .status(400)
        .json({ success: false, message: "Cannot edit a deleted expense" });

    // Validate before mutating anything: if the edit turns splitting on (or
    // keeps it on) for a project that now has no shareholders, reject it —
    // same guard as create.
    if (SplitAmongShareholders) {
      const count = await ShareholderCommitment.countDocuments({
        ProjectId: expenseFields.ProjectId ?? oldExpense.ProjectId,
      });
      if (count === 0) {
        return res.status(400).json({
          success: false,
          message: "This project has no shareholders to split the expense among",
        });
      }
    }

    // Update expense fields
    const updatedExpense = await Expense.findByIdAndUpdate(id, expenseFields, {
      new: true,
    });

    // Await so the response only returns once the report reflects this update
    await dispatchProjectCostReportUpdate({
      oldExpense,
      newExpense: updatedExpense,
      action: "update",
    });

    // Whatever split existed before is stale the moment amount/category/
    // project could have changed — reverse it unconditionally, then
    // re-apply only if the edit still (or now) wants a split.
    await reverseSplit(id);
    const shares = SplitAmongShareholders ? await applySplit(updatedExpense, MarkSharesPaid) : [];

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      expense: updatedExpense,
      shares,
    });
  } catch (err) {
    console.error(err);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message });
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

  await reverseSplit(expense._id);

  await dispatchProjectCostReportUpdate({
    expense,
    action: "delete",
  });
  res.json({ message: "Expense deleted" });
};
