import mongoose from "mongoose";

const ShareholderSchema = new mongoose.Schema(
  {
    Name: { type: String, required: true },
    Phone: String,
    Email: String,
  },
  { timestamps: true }
);

export default mongoose.model("Shareholder", ShareholderSchema);
