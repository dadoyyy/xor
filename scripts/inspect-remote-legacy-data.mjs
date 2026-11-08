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
  console.log("Connecting to:", env.NEXT_PUBLIC_SUPABASE_URL);

  const tables = [
    "rooms",
    "room_members",
    "materials",
    "decks",
    "quizzes",
    "attempts",
    "profiles",
  ];

  const results = {};

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      results[table] = { error: error.message, count: null, sample: null };
    } else {
      const { data: sample } = await supabase.from(table).select("*").limit(5);
      results[table] = { count, sample };
    }
  }

  // Also check auth.users if accessible via auth admin
  const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers();
  results["auth_users"] = {
    count: usersData?.users?.length ?? 0,
    sample: usersData?.users?.slice(0, 5).map(u => ({ id: u.id, email: u.email, created_at: u.created_at })),
  };

  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);

