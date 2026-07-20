// SMTP sender for transactional mail (currently: shareholder invitations).
//
// Configure with a dedicated "bot" mailbox, not a personal account:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_USER=bot@yourdomain.com
//   SMTP_PASS=<app password, not the account password>
//   MAIL_FROM="Sukun Builders <bot@yourdomain.com>"
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
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.06);font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;background-color:#facc15;border-radius:9px;color:#0f172a;font-weight:700;font-size:16px;">SB</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;">
                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.2px;">Sukun Builders</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:4px;">
                    <span style="color:#94a3b8;font-size:13px;">Shareholder Portal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 8px;">
              <p style="margin:0 0 4px;color:#0f172a;font-size:22px;font-weight:700;">You're invited</p>
              <p style="margin:0;color:#64748b;font-size:15px;line-height:1.6;">
                Hello ${name}, you've been invited to access your investment
                details on the Sukun Builders portal.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 8px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background-color:#0f172a;">
                    <a href="${inviteUrl}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:10px;">
                      Set your password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0;">
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;">
                This link expires in <strong style="color:#64748b;">${expiryHours} hours</strong>
                and can only be used once.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 32px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;line-height:1.6;">
                If the button doesn't work, paste this link into your browser:
              </p>
              <p style="margin:0;color:#2563eb;font-size:12px;line-height:1.6;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#2563eb;text-decoration:none;">${inviteUrl}</a>
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
