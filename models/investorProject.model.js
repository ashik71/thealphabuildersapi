import mongoose from "mongoose";

const InvestorProjectSchema = new mongoose.Schema(
  {
    InvestorId: { type: mongoose.Schema.Types.ObjectId, ref: "Investor", required: true },
    ProjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    Amount: { type: Number, required: true, min: 0 },
    Paid: { type: Number, required: true, min: 0, default: 0 },
    ProfitMargin: { type: Number, required: true, min: 0 },
    Deadline: { type: Date, required: true },
    PaymentMethod: {
      type: String,
      enum: ["Bank", "Mobile Banking", "Cash"],
      required: true,
    },
    Notes: { type: String, trim: true },
    Status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      required: true,
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

InvestorProjectSchema.index({ InvestorId: 1, ProjectId: 1 }, { unique: true });

InvestorProjectSchema.virtual("Due").get(function () {
  return this.Amount - this.Paid;
});

export default mongoose.model("InvestorProject", InvestorProjectSchema);
