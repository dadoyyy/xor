import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const idx = line.indexOf("=");
  if (idx !== -1) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  const { data: d } = await client.from("decks").select("id, title, room_id");
  const { data: q } = await client.from("quizzes").select("id, title, room_id");
  console.log("Decks count:", d?.length);
  d?.forEach(item => console.log(`  Deck: "${item.title}" (${item.id})`));
  console.log("Quizzes count:", q?.length);
  q?.forEach(item => console.log(`  Quiz: "${item.title}" (${item.id})`));
}

run();

