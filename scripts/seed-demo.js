/**
 * Seeds a demo database for manual testing of the shareholder portal.
 *
 *   MONGO_URI="<scratch db uri>" node scripts/seed-demo.js
 *
 * Refuses to run against a database whose name does not contain `test` or
 * `demo`, so it can never overwrite dev or production data. Drops and recreates
 * the target database each run.
 *
 * Accounts (password for all: Password123!)
 *   admin@demo.local     — admin
 *   karim@demo.local     — shareholder, funds both projects
 *   fatima@demo.local    — shareholder, funds only Riverside
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Project from "../models/project.model.js";
import Shareholder from "../models/shareholder.model.js";
import ShareholderCommitment from "../models/shareholderCommitment.model.js";
import Payment from "../models/payment.model.js";
import CostCategory from "../models/costCategory.model.js";
import User, { ROLES } from "../models/user.model.js";
dotenv.config();

const PASSWORD = "Password123!";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const dbName = mongoose.connection.db.databaseName;

  if (!/(test|demo)/i.test(dbName)) {
    throw new Error(
      `Refusing to seed "${dbName}" — the name must contain "test" or "demo".`
    );
  }

  await mongoose.connection.dropDatabase();
  console.log(`Seeding ${dbName}…`);

  const hash = bcrypt.hashSync(PASSWORD, 10);

  const [materials, labour] = await CostCategory.create([
    { Name: "Materials" },
    { Name: "Labour" },
  ]);

  const [riverside, hillview] = await Project.create([
    {
      Name: "Riverside Residency",
      Location: "Gulshan, Dhaka",
      Summary: "12-storey residential building with basement parking.",
      Status: "in-progress",
      EstimatedCost: 85000000,
      StartDate: new Date("2026-01-15"),
    },
    {
      Name: "Hillview Apartments",
      Location: "Chattogram",
      Summary: "8-storey apartment complex.",
      Status: "planned",
      EstimatedCost: 42000000,
      StartDate: new Date("2026-06-01"),
    },
  ]);

  const [karim, fatima] = await Shareholder.create([
    { Name: "Karim Ahmed", Email: "karim@demo.local", Phone: "01711000001" },
    { Name: "Fatima Rahman", Email: "fatima@demo.local", Phone: "01711000002" },
  ]);

  await User.create([
    {
      name: "Demo Admin",
      email: "admin@demo.local",
      passwordHash: hash,
      role: ROLES.ADMIN,
    },
    {
      name: "Karim Ahmed",
      email: "karim@demo.local",
      passwordHash: hash,
      role: ROLES.SHAREHOLDER,
      shareholderId: karim._id,
    },
    {
      name: "Fatima Rahman",
      email: "fatima@demo.local",
      passwordHash: hash,
      role: ROLES.SHAREHOLDER,
      shareholderId: fatima._id,
    },
  ]);

  await ShareholderCommitment.create([
    {
      ProjectId: riverside._id,
      ShareholderId: karim._id,
      CommittedAmount: 12500000,
      Notes: "Phase 1 commitment",
    },
    {
      ProjectId: hillview._id,
      ShareholderId: karim._id,
      CommittedAmount: 5000000,
    },
    // Fatima funds Riverside only — the isolation case worth eyeballing.
    {
      ProjectId: riverside._id,
      ShareholderId: fatima._id,
      CommittedAmount: 20000000,
    },
  ]);

  await Payment.create([
    {
      ProjectId: riverside._id,
      ShareholderId: karim._id,
      CostCategoryId: materials._id,
      AmountPaid: 4000000,
      Date: new Date("2026-02-10"),
      Notes: "First instalment",
    },
    {
      ProjectId: riverside._id,
      ShareholderId: karim._id,
      CostCategoryId: labour._id,
      AmountPaid: 2500000,
      Date: new Date("2026-04-02"),
    },
    {
      ProjectId: hillview._id,
      ShareholderId: karim._id,
      AmountPaid: 1000000,
      Date: new Date("2026-06-20"),
    },
    // Fatima's — Karim must never see these on the shared project.
    {
      ProjectId: riverside._id,
      ShareholderId: fatima._id,
      CostCategoryId: materials._id,
      AmountPaid: 9000000,
      Date: new Date("2026-03-01"),
    },
  ]);

  console.log(`
Seeded. Password for every account: ${PASSWORD}

  admin@demo.local    admin
  karim@demo.local    shareholder — Riverside (12.5M committed / 6.5M paid)
                                    Hillview  (5M committed / 1M paid)
  fatima@demo.local   shareholder — Riverside only (20M committed / 9M paid)
`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
