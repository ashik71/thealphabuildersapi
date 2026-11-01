import mongoose from "mongoose";

const InvestorPaymentSchema = new mongoose.Schema(
  {
    InvestorProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvestorProject",
      required: true,
    },
    Amount: { type: Number, required: true, min: 0 },
    PaymentMethod: {
      type: String,
      enum: ["Bank", "Mobile Banking", "Cash"],
      required: true,
    },
    Notes: { type: String, trim: true },
    Date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("InvestorPayment", InvestorPaymentSchema);
