import mongoose from "mongoose";

const InvestorSchema = new mongoose.Schema(
  {
    Name: { type: String, required: true, trim: true },
    Email: { type: String, trim: true, lowercase: true },
    Phone: { type: String, required: true, trim: true },
    Notes: { type: String, trim: true },
    Status: { type: String, enum: ["active", "inactive"], default: "active", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Investor", InvestorSchema);
