import mongoose from "mongoose";
import crypto from "crypto";

const InvitationSchema = new mongoose.Schema(
  {
    Email: { type: String, required: true, lowercase: true, trim: true },
    ShareholderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shareholder",
      required: true,
      index: true,
    },
    // Only the SHA-256 of the token is stored. The raw token exists just once,
    // in the email we send — a database leak cannot be replayed into an
    // account takeover.
    TokenHash: { type: String, required: true, unique: true },
    ExpiresAt: { type: Date, required: true },
    AcceptedAt: { type: Date, default: null },
    RevokedAt: { type: Date, default: null },
    InvitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export function generateInviteToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  return { raw, hash: hashInviteToken(raw) };
}

export function hashInviteToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export default mongoose.model("Invitation", InvitationSchema);
