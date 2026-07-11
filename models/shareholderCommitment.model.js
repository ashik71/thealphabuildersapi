import mongoose from "mongoose";

const ShareholderCommitmentSchema = new mongoose.Schema(
  {
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
    CommittedAmount: { type: Number, required: true },
    Notes: String,
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

ShareholderCommitmentSchema.index({ ProjectId: 1, ShareholderId: 1 }, { unique: true });

export default mongoose.model("ShareholderCommitment", ShareholderCommitmentSchema);
