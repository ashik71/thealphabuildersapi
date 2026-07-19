/**
 * Migrates existing users to the role model.
 *
 *   node scripts/migrate-user-roles.js            # dry run, changes nothing
 *   node scripts/migrate-user-roles.js --confirm  # applies the changes
 *
 * Every existing user predates the shareholder role and is therefore an admin.
 * The migration is additive: it sets `role`, normalises emails, drops the old
 * `isAdmin` field, and creates the unique email index. No document is deleted.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/user.model.js";
dotenv.config();

const apply = process.argv.includes("--confirm");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to: ${mongoose.connection.db.databaseName}`);
  console.log(apply ? "MODE: apply\n" : "MODE: dry run (pass --confirm to apply)\n");

  const users = await mongoose.connection.db
    .collection("users")
    .find({})
    .toArray();

  console.log(`Found ${users.length} user(s):`);
  for (const u of users) {
    const role = u.role || (u.isAdmin === false ? "shareholder" : "admin");
    console.log(`  ${u.email} → role: ${role}`);
  }

  // A unique index cannot be built while duplicates exist. Report and stop
  // rather than letting index creation fail halfway.
  const seen = new Map();
  const duplicates = [];
  for (const u of users) {
    const email = String(u.email || "").toLowerCase().trim();
    if (seen.has(email)) duplicates.push(email);
    seen.set(email, true);
  }

  if (duplicates.length) {
    console.error(
      `\nABORTED: duplicate emails present, resolve these first: ${duplicates.join(", ")}`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!apply) {
    console.log("\nDry run complete. Nothing was written.");
    await mongoose.disconnect();
    return;
  }

  const collection = mongoose.connection.db.collection("users");

  for (const u of users) {
    const role = u.role || (u.isAdmin === false ? "shareholder" : "admin");
    await collection.updateOne(
      { _id: u._id },
      {
        $set: {
          role,
          email: String(u.email).toLowerCase().trim(),
          isActive: u.isActive ?? true,
          shareholderId: u.shareholderId ?? null,
        },
        $unset: { isAdmin: "" },
      }
    );
  }

  await User.syncIndexes();
  console.log(`\nMigrated ${users.length} user(s) and synced indexes.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
