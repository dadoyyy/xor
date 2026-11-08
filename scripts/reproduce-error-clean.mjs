import { PGlite } from "@electric-sql/pglite";
import fs from "fs";

async function run() {
  const db = new PGlite();
  let seedSql = fs.readFileSync("supabase/tests/000_seed_pre_005.sql", "utf8");
  seedSql = seedSql.replace(/create extension.*pgcrypto.*;/gi, "-- built-in");
  await db.exec(seedSql);

  const sql = fs.readFileSync("supabase/migrations/005_user_first_subjects.sql", "utf8");
  try {
    await db.exec(sql);
    console.log("No error thrown!");
  } catch (err) {
    console.log("=== PGLITE ERROR REPRODUCTION ===");
    console.log("Message:", err.message);
    console.log("Code:", err.code);
    console.log("Position:", err.position);
    console.log("Routine:", err.routine);
  }
}

run().catch(e => console.error("Unhandled:", e.message));
