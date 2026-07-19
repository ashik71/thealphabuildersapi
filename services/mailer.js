// SMTP sender for transactional mail (currently: shareholder invitations).
//
// Configure with a dedicated "bot" mailbox, not a personal account:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_USER=bot@yourdomain.com
//   SMTP_PASS=<app password, not the account password>
//   MAIL_FROM="The Alpha Builders <bot@yourdomain.com>"
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let transporter;

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    throw new Error(
      "SMTP is not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS"
    );
  }

  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  return getTransporter().sendMail({ from, to, subject, html, text });
}

export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

export function buildInvitationEmail({ shareholderName, inviteUrl, expiryHours }) {
  const subject = "You have been invited to The Alpha Builders portal";

  const text = [
    `Hello ${shareholderName},`,
    "",
    "You have been invited to access your investment details on The Alpha Builders portal.",
    "Use the link below to set your password and activate your account:",
    "",
    inviteUrl,
    "",
    `This link expires in ${expiryHours} hours and can only be used once.`,
    "If you were not expecting this invitation, you can safely ignore this email.",
  ].join("\n");

  const html = `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
    <h2 style="margin:0 0 8px;font-size:20px;">The Alpha Builders</h2>
    <p style="margin:0 0 24px;color:#666;font-size:14px;">Shareholder portal invitation</p>
    <p>Hello <strong>${escapeHtml(shareholderName)}</strong>,</p>
    <p>You have been invited to access your investment details on The Alpha Builders portal.</p>
    <p style="margin:32px 0;">
      <a href="${inviteUrl}"
         style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;font-weight:600;">
        Set your password
      </a>
    </p>
    <p style="color:#666;font-size:13px;">
      This link expires in <strong>${expiryHours} hours</strong> and can only be used once.
      If you were not expecting this invitation, you can safely ignore this email.
    </p>
    <p style="color:#999;font-size:12px;word-break:break-all;margin-top:24px;">
      If the button does not work, paste this into your browser:<br>${inviteUrl}
    </p>
  </div>`;

  return { subject, text, html };
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}
