import fs from "fs";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const idx = line.indexOf("=");
  if (idx !== -1) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
}

async function main() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  const schema = await res.json();
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

  const report = {};
  for (const t of tables) {
    const def = schema.definitions?.[t];
    if (def) {
      report[t] = {
        properties: Object.keys(def.properties || {}).map(p => ({
          name: p,
          type: def.properties[p].type,
          format: def.properties[p].format,
          description: def.properties[p].description
        })),
        required: def.required
      };
    } else {
      report[t] = "Not found in definitions";
    }
  }

  fs.writeFileSync("backups/schema_definitions.json", JSON.stringify(report, null, 2), "utf8");
  console.log("Schema definitions saved. Tables found:", Object.keys(report).filter(k => report[k] !== "Not found in definitions"));
}

main().catch(console.error);

