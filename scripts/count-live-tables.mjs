import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
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

  const report = {};
  for (const t of tables) {
    // Both count: exact with head: true, and fetching all rows length to be 100% sure
    const { count, error: errCount } = await supabase.from(t).select("*", { count: "exact", head: true });
    const { data, error: errData } = await supabase.from(t).select("*");
    report[t] = {
      exact_head_count: count,
      data_length: data?.length,
      count_error: errCount?.message,
      data_error: errData?.message
    };
  }

  // Also query auth.users count
  const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  report["auth_users"] = {
    exact_head_count: usersData?.users?.length,
    data_length: usersData?.users?.length,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);

