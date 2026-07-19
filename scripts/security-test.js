/**
 * Isolation tests for the shareholder role.
 *
 *   node scripts/security-test.js
 *
 * Requires an API instance running against a SCRATCH database — the script
 * seeds and then drops its own data, so never point it at the dev or
 * production database.
 *
 * Scenario: two shareholders (A and B) both fund the "Shared" project; only A
 * funds "Solo". Every assertion below is about what B must NOT be able to see.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Project from "../models/project.model.js";
import Shareholder from "../models/shareholder.model.js";
import ShareholderCommitment from "../models/shareholderCommitment.model.js";
import Payment from "../models/payment.model.js";
import User, { ROLES } from "../models/user.model.js";
import Invitation, { generateInviteToken } from "../models/invitation.model.js";

dotenv.config({ path: process.env.TEST_ENV_PATH });

const API = process.env.TEST_API_URL || "http://localhost:4100";

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, data };
}

async function login(email, password) {
  const { data } = await api("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return data?.token;
}

async function seed() {
  const db = mongoose.connection.db.databaseName;
  if (!/test/i.test(db)) {
    throw new Error(
      `Refusing to run: database "${db}" is not a test database. Point TEST_ENV_PATH at a scratch DB.`
    );
  }
  // Safe: this database is created and dropped by this script alone.
  await mongoose.connection.dropDatabase();

  const hash = bcrypt.hashSync("Password123!", 10);

  const [shared, solo] = await Project.create([
    { Name: "Shared Project", Location: "Dhaka", Status: "in-progress" },
    { Name: "Solo Project", Location: "Chattogram", Status: "planned" },
  ]);

  const [shA, shB] = await Shareholder.create([
    { Name: "Shareholder A", Email: "a@test.local" },
    { Name: "Shareholder B", Email: "b@test.local" },
  ]);

  const admin = await User.create({
    name: "Admin",
    email: "admin@test.local",
    passwordHash: hash,
    role: ROLES.ADMIN,
  });

  const userA = await User.create({
    name: "A",
    email: "a@test.local",
    passwordHash: hash,
    role: ROLES.SHAREHOLDER,
    shareholderId: shA._id,
  });

  await User.create({
    name: "B",
    email: "b@test.local",
    passwordHash: hash,
    role: ROLES.SHAREHOLDER,
    shareholderId: shB._id,
  });

  await ShareholderCommitment.create([
    { ProjectId: shared._id, ShareholderId: shA._id, CommittedAmount: 500000 },
    { ProjectId: shared._id, ShareholderId: shB._id, CommittedAmount: 300000 },
    { ProjectId: solo._id, ShareholderId: shA._id, CommittedAmount: 100000 },
  ]);

  await Payment.create([
    { ProjectId: shared._id, ShareholderId: shA._id, AmountPaid: 200000 },
    { ProjectId: shared._id, ShareholderId: shB._id, AmountPaid: 50000 },
    { ProjectId: solo._id, ShareholderId: shA._id, AmountPaid: 25000 },
  ]);

  return { shared, solo, shA, shB, admin, userA };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const ctx = await seed();
  console.log(`Seeded scratch DB: ${mongoose.connection.db.databaseName}\n`);

  const adminToken = await login("admin@test.local", "Password123!");
  const tokenB = await login("b@test.local", "Password123!");

  console.log("Cross-shareholder isolation");
  {
    const { status } = await api(`/api/me/projects/${ctx.solo._id}`, {
      token: tokenB,
    });
    check(
      "B requesting A's project returns 404 (not 403, which would confirm it exists)",
      status === 404,
      `got ${status}`
    );
  }
  {
    const { data } = await api("/api/me/projects", { token: tokenB });
    const ids = (data || []).map((p) => p.ProjectId);
    check("B's project list excludes A's solo project", !ids.includes(String(ctx.solo._id)));
    check("B's project list contains only the shared project", ids.length === 1);
  }
  {
    const { data } = await api(`/api/me/projects/${ctx.shared._id}`, {
      token: tokenB,
    });
    check(
      "On the shared project B sees only B's own commitment (300000)",
      data?.Committed === 300000,
      `got ${data?.Committed}`
    );
    check(
      "On the shared project B sees only B's own payments (50000)",
      data?.Paid === 50000,
      `got ${data?.Paid}`
    );
    check(
      "Response exposes no other shareholder's identity",
      !JSON.stringify(data).includes("Shareholder A")
    );
  }
  {
    const { data } = await api("/api/me/summary", { token: tokenB });
    check("B's summary totals cover only B's own money", data?.Committed === 300000, `got ${data?.Committed}`);
  }

  console.log("\nPrivilege boundaries");
  for (const path of [
    "/api/projects",
    "/api/expenses",
    "/api/shareholders",
    "/api/commitments",
    "/api/cost-categories",
  ]) {
    const { status } = await api(path, { token: tokenB });
    check(`shareholder is denied admin route ${path}`, status === 403, `got ${status}`);
  }
  {
    const { status } = await api("/api/me/projects", { token: adminToken });
    check("admin is denied the shareholder-scoped route", status === 403, `got ${status}`);
  }
  {
    const { status } = await api("/api/auth/users", {
      method: "POST",
      token: tokenB,
      body: {
        name: "Escalated",
        email: "evil@test.local",
        password: "Password123!",
        role: "admin",
      },
    });
    check("shareholder cannot create an admin account", status === 403, `got ${status}`);
  }
  {
    const { status } = await api("/api/auth/register", {
      method: "POST",
      body: { name: "X", email: "x@test.local", password: "p", isAdmin: true },
    });
    check("the old open register endpoint is gone", status === 404, `got ${status}`);
  }

  console.log("\nToken and session handling");
  {
    const { status } = await api("/api/me/projects");
    check("no token is rejected", status === 401, `got ${status}`);
  }
  {
    const { status } = await api("/api/me/projects", { token: "not.a.jwt" });
    check("a forged token is rejected", status === 401, `got ${status}`);
  }
  {
    await User.updateOne({ email: "b@test.local" }, { $set: { isActive: false } });
    const { status } = await api("/api/me/projects", { token: tokenB });
    check(
      "a deactivated user is locked out immediately, despite a still-valid JWT",
      status === 401,
      `got ${status}`
    );
    await User.updateOne({ email: "b@test.local" }, { $set: { isActive: true } });
  }
  {
    const userA = await User.findOne({ email: "a@test.local" });
    const tokenA = await login("a@test.local", "Password123!");
    await User.updateOne({ _id: userA._id }, { $set: { role: ROLES.ADMIN } });
    const { status } = await api("/api/me/projects", { token: tokenA });
    check("a role change takes effect on the existing token", status === 403, `got ${status}`);
    await User.updateOne({ _id: userA._id }, { $set: { role: ROLES.SHAREHOLDER } });
  }
  {
    const { status } = await api("/api/auth/login", {
      method: "POST",
      body: { email: "b@test.local", password: "WrongPassword1!" },
    });
    check("a wrong password is rejected", status === 401, `got ${status}`);
  }

  console.log("\nInvitation integrity");
  {
    const { raw, hash } = generateInviteToken();
    const inv = await Invitation.create({
      Email: "c@test.local",
      ShareholderId: ctx.shB._id,
      TokenHash: hash,
      ExpiresAt: new Date(Date.now() + 3600000),
      InvitedBy: ctx.admin._id,
    });

    const tampered = await api(`/api/invitations/token/${raw.slice(0, -4)}dead`, {});
    check("a tampered invite token is rejected", tampered.status === 404, `got ${tampered.status}`);

    const body = { name: "C", password: "Password123!" };
    const first = await api(`/api/invitations/token/${raw}/accept`, {
      method: "POST",
      body,
    });
    check("a valid invite creates the account", first.status === 201, `got ${first.status}`);

    const replay = await api(`/api/invitations/token/${raw}/accept`, {
      method: "POST",
      body,
    });
    check("the same invite cannot be reused", replay.status === 404, `got ${replay.status}`);

    const created = await User.findOne({ email: "c@test.local" });
    check("the invited account is a shareholder, never an admin", created?.role === ROLES.SHAREHOLDER);
    check(
      "the account is bound to the shareholder named in the invite",
      String(created?.shareholderId) === String(ctx.shB._id)
    );
    await Invitation.deleteOne({ _id: inv._id });
  }
  {
    const { raw, hash } = generateInviteToken();
    await Invitation.create({
      Email: "d@test.local",
      ShareholderId: ctx.shB._id,
      TokenHash: hash,
      ExpiresAt: new Date(Date.now() - 1000),
      InvitedBy: ctx.admin._id,
    });
    const { status } = await api(`/api/invitations/token/${raw}/accept`, {
      method: "POST",
      body: { name: "D", password: "Password123!" },
    });
    check("an expired invite is rejected", status === 404, `got ${status}`);
  }
  {
    const stored = await Invitation.findOne({ Email: "d@test.local" });
    check(
      "invitations are stored hashed, never as the raw token",
      /^[a-f0-9]{64}$/.test(stored.TokenHash)
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
