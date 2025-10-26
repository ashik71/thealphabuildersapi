import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: String,
  location: String,
  summary: String,
  costEstimate: Number,
  createdAt: { type: Date, default: Date.now },
  viewTokens: [{
    token: String,
    expiresAt: Date
  }]
});

export default mongoose.model("Project", projectSchema);
