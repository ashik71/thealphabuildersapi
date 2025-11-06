import mongoose from "mongoose";

const BreakdownSchema = new mongoose.Schema(
  {
    CategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    CategoryName: {
      type: String,
      required: true,
    },
    SubcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    SubcategoryName: {
      type: String,
    },
    EstimatedCost: {
      type: Number,
      default: 0,
    },
    ActualCost: {
      type: Number,
      default: 0,
    },
  },
  { _id: false } // subdocuments, no need for their own IDs
);

const SummarySchema = new mongoose.Schema(
  {
    EstimatedTotal: {
      type: Number,
      default: 0,
    },
    ActualTotal: {
      type: Number,
      default: 0,
    },
    Difference: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const ProjectCostReportSchema = new mongoose.Schema(
  {
    ProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    Summary: {
      type: SummarySchema,
      default: {},
    },
    Breakdown: {
      type: [BreakdownSchema],
      default: [],
    },
    GeneratedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
    versionKey: false,
  }
);

export default mongoose.model("ProjectCostReport", ProjectCostReportSchema);
