import { PGlite } from "@electric-sql/pglite";
import fs from "fs";

async function test() {
  const db = new PGlite();
  // Set up auth, storage, pre-005 schema & data
  const seedSql = fs.readFileSync("supabase/tests/000_seed_pre_005.sql", "utf8");
  await db.exec(seedSql);

  console.log("Pre-005 seed applied successfully. Now applying un-fixed 005_user_first_subjects.sql...");
  const migrationSql = fs.readFileSync("supabase/migrations/005_user_first_subjects.sql", "utf8");
  try {
    await db.exec(migrationSql);
    console.log("Migration succeeded unexpectedly!");
  } catch (err) {
    console.log("PGlite caught error:", err.message);
  }
}

test();

