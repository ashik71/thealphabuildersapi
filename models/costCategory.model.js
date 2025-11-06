import mongoose from "mongoose";

const CostCategorySchema = new mongoose.Schema(
  {
    Name: { type: String, required: true },
    ParentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CostCategory",
      default: null,
    },
    Description: String,
  },
  { timestamps: true }
);

export default mongoose.model("CostCategory", CostCategorySchema);
