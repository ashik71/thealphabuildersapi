/**
 * Verifies Resend configuration by sending a sample invitation email.
 *
 *   node scripts/test-email.js you@example.com
 *
 * Sends the real invitation template with a dummy link, so you can check both
 * that credentials work and that the email renders properly.
 */
import dotenv from "dotenv";
import { sendMail, buildInvitationEmail, isMailConfigured } from "../services/mailer.js";
import { getFrontendUrl } from "../utils/frontendUrl.js";
dotenv.config();

const to = process.argv[2];

if (!to) {
  console.error("Usage: node scripts/test-email.js <recipient@example.com>");
  process.exit(1);
}

if (!isMailConfigured()) {
  console.error("Resend is not configured. Add RESEND_API_KEY and MAIL_FROM to .env");
  process.exit(1);
}

console.log(`Sending as: ${process.env.MAIL_FROM}`);
console.log(`Sending to: ${to}\n`);

const { subject, html, text } = buildInvitationEmail({
  shareholderName: "Test Shareholder",
  inviteUrl: `${getFrontendUrl()}/accept-invite/this-is-only-a-test`,
  expiryHours: 48,
});

try {
  const info = await sendMail({ to, subject, html, text });
  console.log("Sent successfully.");
  console.log(`Message id: ${info.id}`);
  console.log("\nIf it does not arrive, check the spam folder before assuming failure.");
} catch (err) {
  console.error("Send failed:\n");
  console.error(err.message);
  process.exit(1);
}
