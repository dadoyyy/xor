import { PGlite } from "@electric-sql/pglite";
import fs from "fs";

async function main() {
  console.log("Initializing clean throwaway local Postgres (PGlite)...");
  const db = new PGlite();

  console.log("Reading backups/backup_20261108.sql...");
  const sql = fs.readFileSync("backups/backup_20261108.sql", "utf8");

  console.log("Executing dump in throwaway Postgres...");
  await db.exec(sql);

  const tables = [
    "rooms",
    "room_members",
    "materials",
    "decks",
    "cards",
    "quizzes",
    "quiz_questions",
    "quiz_answer_keys",
    "attempts",
    "attempt_answers",
    "reset_polls",
    "reset_votes",
    "room_seen",
    "profiles",
  ];

  console.log("Querying restored row counts from throwaway Postgres...");
  const restoredCounts = {};
  for (const t of tables) {
    const res = await db.query(`SELECT count(*)::int AS count FROM public.${t}`);
    restoredCounts[t] = res.rows[0].count;
  }

  console.log("\n=== RESTORE TEST RESULTS ===");
  console.log(JSON.stringify(restoredCounts, null, 2));

  return restoredCounts;
}

main().catch(err => {
  console.error("Restore failed:", err);
  process.exit(1);
});

