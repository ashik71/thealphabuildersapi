import mongoose from "mongoose";

// Audit trail for an expense that was split equally across a project's
// shareholders. Amount here is always this shareholder's slice of a single
// Expense — it does not itself feed ShareholderCommitment/Payment totals,
// those are updated separately at creation time (see expense.controller.js)
// and remain the source of truth for Committed/Paid.
const ExpenseShareSchema = new mongoose.Schema(
  {
    ExpenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      required: true,
      index: true,
    },
    ProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    ShareholderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shareholder",
      required: true,
      index: true,
    },
    Amount: { type: Number, required: true },
    Paid: { type: Boolean, default: false },
    // Set only when Paid — the Payment record created to reflect this share
    // in the shareholder's funding report.
    PaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ExpenseShare", ExpenseShareSchema);
