// Transactional mail (currently: shareholder invitations) via Resend's HTTP
// API — not SMTP. Render's free tier blocks all outbound traffic on SMTP
// ports 25/465/587 (platform-wide anti-spam policy since Sept 2025), so any
// SMTP provider — Gmail, Resend's own smtp-relay, anything — fails the same
// way. Resend's REST API runs over HTTPS/443, which isn't blocked.
//
// Configure:
//   RESEND_API_KEY=re_...
//   MAIL_FROM="Sukun Builders <noreply@sukunbuilders.com>"  (domain must be
//     verified in Resend, or sends are limited to the account's own address)
import dotenv from "dotenv";
import { getFrontendUrl } from "../utils/frontendUrl.js";
dotenv.config();

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM;
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }

  return res.json();
}

export function isMailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export function buildInvitationEmail({ shareholderName, inviteUrl, expiryHours }) {
  const subject = "You have been invited to the Sukun Builders portal";
  const name = escapeHtml(shareholderName);

  const text = [
    `Hello ${shareholderName},`,
    "",
    "You have been invited to access your investment details on the Sukun Builders portal.",
    "Use the link below to set your password and activate your account:",
    "",
    inviteUrl,
    "",
    `This link expires in ${expiryHours} hours and can only be used once.`,
    "If you were not expecting this invitation, you can safely ignore this email.",
  ].join("\n");

  const logoUrl = `${getFrontendUrl()}/brand/logo-email.png`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    You've been invited to the Sukun Builders shareholder portal. Set your password to get started.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#facc15,#f5c518,#facc15);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:48px 40px 40px;" align="center">
              <img src="${logoUrl}" width="56" height="56" alt="Sukun Builders"
                   style="display:block;width:56px;height:56px;border-radius:14px;margin:0 auto 20px;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Sukun Builders</div>
              <div style="color:#94a3b8;font-size:13px;letter-spacing:0.4px;text-transform:uppercase;margin-top:6px;">Shareholder Portal</div>
            </td>
          </tr>
          <tr>
            <td style="padding:44px 40px 8px;" align="center">
              <p style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:700;">You're invited, ${name}</p>
              <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;max-width:380px;">
                You've been granted access to your investment details on the
                Sukun Builders portal — commitments, payments, and project
                progress, in one place.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 8px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:12px;background-color:#facc15;">
                    <a href="${inviteUrl}"
                       style="display:inline-block;padding:16px 40px;color:#0f172a;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;">
                      Set your password →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0;" align="center">
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                Expires in <strong style="color:#64748b;">${expiryHours} hours</strong> ·
                single use
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 32px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;line-height:1.6;">
                If the button doesn't work, paste this link into your browser:
              </p>
              <p style="margin:0;color:#1d5c74;font-size:12px;line-height:1.6;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#1d5c74;text-decoration:none;">${inviteUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
                If you weren't expecting this invitation, you can safely ignore this email.<br>
                &copy; ${new Date().getFullYear()} Sukun Builders. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}
