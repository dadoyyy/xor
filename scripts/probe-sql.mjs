import fs from "fs";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const idx = line.indexOf("=");
  if (idx !== -1) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
}

async function probe() {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };

  const endpoints = [
    `${env.NEXT_PUBLIC_SUPABASE_URL}/pg/query`,
    `${env.NEXT_PUBLIC_SUPABASE_URL}/pg/sql`,
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`,
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/execute`,
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/run_sql`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query: "SELECT 1" }) });
      console.log(url, res.status);
    } catch (e) {
      console.log(url, "error:", e.message);
    }
  }
}

probe();

