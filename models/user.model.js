import mongoose from "mongoose";

export const ROLES = {
  ADMIN: "admin",
  SHAREHOLDER: "shareholder",
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.SHAREHOLDER,
      required: true,
    },
    // Set only for role === 'shareholder'. Scoped queries derive the caller's
    // accessible projects from this shareholder's commitments — never from a
    // project list stored on the user, which could drift out of sync.
    shareholderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shareholder",
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Kept as a virtual so existing clients reading `isAdmin` keep working.
userSchema.virtual("isAdmin").get(function () {
  return this.role === ROLES.ADMIN;
});

userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// passwordHash must never reach a client, even if a controller forgets to strip it.
userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
