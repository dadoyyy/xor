import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const idx = line.indexOf("=");
  if (idx !== -1) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const tables = [
    "profiles",
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
    "room_seen"
  ];

  const schemaInfo = {};
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (error) {
      console.error("Error fetching", t, error.message);
    } else if (data && data.length > 0) {
      schemaInfo[t] = Object.keys(data[0]);
    } else {
      // If table is empty, fetch one row or RPC
      schemaInfo[t] = "(empty table)";
    }
  }

  console.log(JSON.stringify(schemaInfo, null, 2));
}

main().catch(console.error);

