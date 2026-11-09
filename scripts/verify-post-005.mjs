import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[trimmed.slice(0, idx).trim()] = v;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("=== RUNNING POST-APPLY VERIFICATION ON REMOTE DATABASE ===");

  // 1. Row counts
  const tables = [
    "subjects",
    "library_entries",
    "materials",
    "decks",
    "cards",
    "quizzes",
    "quiz_questions",
    "quiz_answer_keys",
    "attempts",
    "attempt_answers",
    "profiles",
    "activity_days",
    "study_activity_events",
    "calendar_events",
    "subject_seen"
  ];

  const rowCounts = {};
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
    if (error) {
      rowCounts[t] = { error: error.message };
    } else {
      rowCounts[t] = count;
    }
  }

  // 2. Roles in library_entries
  const { data: entries, error: errEntries } = await supabase.from("library_entries").select("role");
  const roleDistribution = {};
  if (entries) {
    for (const e of entries) {
      roleDistribution[e.role] = (roleDistribution[e.role] || 0) + 1;
    }
  }

  // 3. Storage objects in 'materials'
  const { data: storageFiles, error: errStorage } = await supabase.storage.from("materials").list("", { limit: 100 });
  const storageObjects = [];
  if (storageFiles) {
    for (const f of storageFiles) {
      if (f.id) {
        storageObjects.push(f.name);
      } else {
        // Folder: list inside
        const { data: subFiles } = await supabase.storage.from("materials").list(f.name, { limit: 100 });
        if (subFiles) {
          for (const sf of subFiles) {
            storageObjects.push(`${f.name}/${sf.name}`);
          }
        }
      }
    }
  }

  // 4. Activity days backfilled details
  const { data: actDays, error: errAct } = await supabase.from("activity_days").select("user_id, activity_date, quizzes_completed, materials_added, points_earned");

  // 5. Profile columns populated check
  const { data: profs, error: errProf } = await supabase.from("profiles").select("id, username, timezone, current_streak, longest_streak, last_active_date");

  // 6. Functions check via PostgREST OpenAPI spec
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const spec = await res.json();
  const rpcs = Object.keys(spec.paths || {})
    .filter(p => p.startsWith("/rpc/"))
    .map(p => p.replace("/rpc/", ""));

  const targetFunctions = [
    "set_my_username",
    "user_local_date",
    "record_study_activity",
    "record_deck_card_reviews",
    "preview_subject_by_key",
    "get_subject_share_key",
    "transfer_subject_ownership"
  ];
  const functionStatus = {};
  for (const fn of targetFunctions) {
    functionStatus[fn] = rpcs.includes(fn) ? "EXISTS" : "NOT IN OPENAPI";
  }

  const report = {
    rowCounts,
    roleDistribution,
    storageObjectsCount: storageObjects.length,
    storageSamplePaths: storageObjects.slice(0, 5),
    activityDaysCount: actDays ? actDays.length : 0,
    activityDaysSample: actDays ? actDays.slice(0, 3) : [],
    profilesCount: profs ? profs.length : 0,
    profilesColumnsValid: profs ? profs.every(p => p.timezone !== undefined && p.current_streak !== undefined && p.longest_streak !== undefined) : false,
    profilesSampleStreaks: profs ? profs.slice(0, 4).map(p => ({ tz: p.timezone, streak: p.current_streak, longest: p.longest_streak, last_active: p.last_active_date })) : [],
    functions: functionStatus
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);

