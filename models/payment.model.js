import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    ProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    ShareholderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shareholder",
      required: true,
    },
    CostCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CostCategory",
      required: true,
    },
    AmountPaid: { type: Number, required: true },
    Date: { type: Date, default: Date.now },
    Notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);
