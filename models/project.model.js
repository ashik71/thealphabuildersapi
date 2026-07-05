import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    Name: { type: String, required: true },
    Location: String,
    Summary: String,
    EstimatedCost: { type: Number, default: 0 },
    ActualCost: { type: Number, default: 0 },
    StartDate: Date,
    EndDate: Date,
    Status: {
    type: String,
    enum: ['planned', 'in-progress', 'completed', 'on-hold'],
    default: 'planned'
  },
    viewTokens: {
      type: [
        {
          token: { type: String, required: true },
          expiresAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Project", ProjectSchema);
