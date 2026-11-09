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

async function run() {
  console.log("Checking DB URL:", env.NEXT_PUBLIC_SUPABASE_URL);

  const tables = ["subjects", "library_entries", "activity_days", "study_activity_events"];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    console.log(`Table '${table}':`, error ? `FAIL: ${error.message} (code ${error.code})` : `EXISTS (${data.length} rows)`);
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("set_my_username", { p_username: "test_check" });
  console.log("Function 'set_my_username':", rpcError ? `FAIL: ${rpcError.message} (code ${rpcError.code})` : `EXISTS`);
}

run().catch(console.error);

