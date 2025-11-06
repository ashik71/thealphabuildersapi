import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    ProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    CostCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CostCategory",
      required: true,
    },
    SubCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CostCategory",
      default: null,
    },
    Description: String,
    Amount: { type: Number, required: true },
    Date: { type: Date, default: Date.now },
    PaidTo: String,
    Notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("Expense", ExpenseSchema);
