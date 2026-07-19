import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Invitation, {
  generateInviteToken,
  hashInviteToken,
} from "../models/invitation.model.js";
import Shareholder from "../models/shareholder.model.js";
import User, { ROLES } from "../models/user.model.js";
import { getFrontendUrl } from "../utils/frontendUrl.js";
import {
  sendMail,
  buildInvitationEmail,
  isMailConfigured,
} from "../services/mailer.js";
dotenv.config();

// Admin: invite a shareholder to create a portal account.
export const createInvitation = async (req, res) => {
  const { shareholderId, expiryHours } = req.body;

  const shareholder = await Shareholder.findById(shareholderId);
  if (!shareholder) {
    return res.status(404).json({ message: "Shareholder not found" });
  }
  if (!shareholder.Email) {
    return res.status(400).json({
      message:
        "This shareholder has no email address. Add one before inviting them.",
    });
  }

  const email = shareholder.Email.toLowerCase().trim();

  if (await User.findOne({ email })) {
    return res
      .status(409)
      .json({ message: "This shareholder already has an account" });
  }

  // Supersede any outstanding invitation so only the newest link works.
  await Invitation.updateMany(
    { ShareholderId: shareholderId, AcceptedAt: null, RevokedAt: null },
    { $set: { RevokedAt: new Date() } }
  );

  const { raw, hash } = generateInviteToken();
  const invitation = await Invitation.create({
    Email: email,
    ShareholderId: shareholderId,
    TokenHash: hash,
    ExpiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
    InvitedBy: req.user.userId,
  });

  const inviteUrl = `${getFrontendUrl()}/accept-invite/${raw}`;

  if (!isMailConfigured()) {
    // Without SMTP the invitation is still valid — hand the link back so the
    // admin can deliver it themselves rather than failing the whole request.
    return res.status(201).json({
      message: "Invitation created, but email is not configured. Share this link manually.",
      emailSent: false,
      inviteUrl,
      expiresAt: invitation.ExpiresAt,
    });
  }

  try {
    const { subject, html, text } = buildInvitationEmail({
      shareholderName: shareholder.Name,
      inviteUrl,
      expiryHours,
    });
    await sendMail({ to: email, subject, html, text });
  } catch (err) {
    console.error("Invitation email failed:", err);
    return res.status(201).json({
      message: "Invitation created, but the email could not be sent. Share this link manually.",
      emailSent: false,
      inviteUrl,
      expiresAt: invitation.ExpiresAt,
    });
  }

  // The link is returned to the admin who just created it — they can already
  // invite anyone, so this grants no access they did not have. It lets them
  // copy the link for manual delivery or resend it without issuing a new one.
  res.status(201).json({
    message: `Invitation sent to ${email}`,
    emailSent: true,
    inviteUrl,
    expiresAt: invitation.ExpiresAt,
  });
};

// Admin: list invitations, newest first.
export const getInvitations = async (req, res) => {
  const filter = {};
  if (req.query.shareholderId) filter.ShareholderId = req.query.shareholderId;

  const invitations = await Invitation.find(filter)
    .populate("ShareholderId", "Name Email")
    .select("-TokenHash")
    .sort({ createdAt: -1 });

  res.json(invitations);
};

// Admin: revoke an outstanding invitation.
export const revokeInvitation = async (req, res) => {
  const invitation = await Invitation.findById(req.params.id);
  if (!invitation) return res.status(404).json({ message: "Not found" });
  if (invitation.AcceptedAt) {
    return res
      .status(409)
      .json({ message: "This invitation has already been accepted" });
  }

  invitation.RevokedAt = new Date();
  await invitation.save();
  res.json({ message: "Invitation revoked" });
};

async function findUsableInvitation(rawToken) {
  const invitation = await Invitation.findOne({
    TokenHash: hashInviteToken(rawToken),
    AcceptedAt: null,
    RevokedAt: null,
    ExpiresAt: { $gt: new Date() },
  }).populate("ShareholderId", "Name Email");

  return invitation;
}

// Public: check a token so the accept page can greet the invitee.
// Returns only the display name — never the shareholder id or any figures.
export const getInvitation = async (req, res) => {
  const invitation = await findUsableInvitation(req.params.token);
  if (!invitation) {
    return res
      .status(404)
      .json({ message: "This invitation link is invalid or has expired" });
  }

  res.json({
    email: invitation.Email,
    shareholderName: invitation.ShareholderId?.Name || null,
    expiresAt: invitation.ExpiresAt,
  });
};

// Public: accept an invitation and create the shareholder account.
export const acceptInvitation = async (req, res) => {
  const rawToken = req.params.token;
  const now = new Date();

  // Claim the invitation atomically before creating anything. Two concurrent
  // submissions of the same link cannot both pass this filter, so a token can
  // never mint two accounts.
  const invitation = await Invitation.findOneAndUpdate(
    {
      TokenHash: hashInviteToken(rawToken),
      AcceptedAt: null,
      RevokedAt: null,
      ExpiresAt: { $gt: now },
    },
    { $set: { AcceptedAt: now } },
    { new: true }
  );

  if (!invitation) {
    return res
      .status(404)
      .json({ message: "This invitation link is invalid, expired, or already used" });
  }

  if (await User.findOne({ email: invitation.Email })) {
    return res
      .status(409)
      .json({ message: "An account with this email already exists" });
  }

  // Email, role and shareholder link all come from the invitation record.
  // The request body contributes nothing but a display name and a password.
  const user = await User.create({
    name: req.body.name,
    email: invitation.Email,
    passwordHash: bcrypt.hashSync(req.body.password, 10),
    role: ROLES.SHAREHOLDER,
    shareholderId: invitation.ShareholderId._id ?? invitation.ShareholderId,
    isActive: true,
  });

  res.status(201).json({
    message: "Account created. You can now sign in.",
    email: user.email,
  });
};
