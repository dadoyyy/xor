import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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

function sqlVal(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    const elements = v.map(el => typeof el === "string" ? `"${el.replace(/"/g, '\\"')}"` : el).join(",");
    return `'${"{" + elements + "}"}'`;
  }
  if (typeof v === "object") {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  const today = "20261108";
  const fullOut = path.resolve(`backups/backup_${today}.sql`);
  const schemaOut = path.resolve(`backups/backup_${today}_schema.sql`);
  const dataOut = path.resolve(`backups/backup_${today}_data.sql`);

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

  let schemaSql = `-- =====================================================================\n`;
  schemaSql += `-- XOR Live Database Backup Schema: ${today}\n`;
  schemaSql += `-- Target: https://suctmauaolyuguusydwn.supabase.co\n`;
  schemaSql += `-- =====================================================================\n\n`;

  schemaSql += `-- 1. Table Definitions (Pre-Migration 005 Live Schema)\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.profiles (\n`;
  schemaSql += `  id UUID PRIMARY KEY,\n`;
  schemaSql += `  username TEXT UNIQUE,\n`;
  schemaSql += `  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.rooms (\n`;
  schemaSql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  schemaSql += `  name TEXT NOT NULL,\n`;
  schemaSql += `  description TEXT,\n`;
  schemaSql += `  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,\n`;
  schemaSql += `  secret_key TEXT NOT NULL UNIQUE,\n`;
  schemaSql += `  leaderboard_epoch INT NOT NULL DEFAULT 1,\n`;
  schemaSql += `  cover TEXT,\n`;
  schemaSql += `  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.room_members (\n`;
  schemaSql += `  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,\n`;
  schemaSql += `  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,\n`;
  schemaSql += `  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),\n`;
  schemaSql += `  cover TEXT,\n`;
  schemaSql += `  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n`;
  schemaSql += `  PRIMARY KEY (room_id, user_id)\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.materials (\n`;
  schemaSql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  schemaSql += `  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,\n`;
  schemaSql += `  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,\n`;
  schemaSql += `  title TEXT NOT NULL,\n`;
  schemaSql += `  file_path TEXT,\n`;
  schemaSql += `  file_size BIGINT,\n`;
  schemaSql += `  status TEXT NOT NULL DEFAULT 'uploaded',\n`;
  schemaSql += `  content TEXT,\n`;
  schemaSql += `  page_count INT,\n`;
  schemaSql += `  error TEXT,\n`;
  schemaSql += `  processing_started_at TIMESTAMPTZ,\n`;
  schemaSql += `  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.decks (\n`;
  schemaSql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  schemaSql += `  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,\n`;
  schemaSql += `  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,\n`;
  schemaSql += `  title TEXT NOT NULL,\n`;
  schemaSql += `  difficulty TEXT DEFAULT 'medium',\n`;
  schemaSql += `  material_ids UUID[],\n`;
  schemaSql += `  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.cards (\n`;
  schemaSql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  schemaSql += `  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,\n`;
  schemaSql += `  position INT NOT NULL,\n`;
  schemaSql += `  front TEXT NOT NULL,\n`;
  schemaSql += `  back TEXT NOT NULL\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.quizzes (\n`;
  schemaSql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  schemaSql += `  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,\n`;
  schemaSql += `  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,\n`;
  schemaSql += `  title TEXT NOT NULL,\n`;
  schemaSql += `  material_ids UUID[],\n`;
  schemaSql += `  question_types TEXT[],\n`;
  schemaSql += `  difficulty TEXT DEFAULT 'medium',\n`;
  schemaSql += `  question_count INT DEFAULT 0,\n`;
  schemaSql += `  time_limit_minutes INT,\n`;
  schemaSql += `  max_score NUMERIC NOT NULL DEFAULT 0,\n`;
  schemaSql += `  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.quiz_questions (\n`;
  schemaSql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  schemaSql += `  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,\n`;
  schemaSql += `  position INT NOT NULL,\n`;
  schemaSql += `  qtype TEXT NOT NULL,\n`;
  schemaSql += `  prompt TEXT NOT NULL,\n`;
  schemaSql += `  choices JSONB,\n`;
  schemaSql += `  points NUMERIC NOT NULL DEFAULT 1\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.quiz_answer_keys (\n`;
  schemaSql += `  question_id UUID PRIMARY KEY REFERENCES public.quiz_questions(id) ON DELETE CASCADE,\n`;
  schemaSql += `  answer JSONB NOT NULL,\n`;
  schemaSql += `  explanation TEXT\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.attempts (\n`;
  schemaSql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  schemaSql += `  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,\n`;
  schemaSql += `  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,\n`;
  schemaSql += `  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,\n`;
  schemaSql += `  epoch INT NOT NULL DEFAULT 1,\n`;
  schemaSql += `  counts BOOLEAN NOT NULL DEFAULT false,\n`;
  schemaSql += `  status TEXT NOT NULL DEFAULT 'in_progress',\n`;
  schemaSql += `  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n`;
  schemaSql += `  submitted_at TIMESTAMPTZ,\n`;
  schemaSql += `  score NUMERIC,\n`;
  schemaSql += `  max_score NUMERIC\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.attempt_answers (\n`;
  schemaSql += `  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,\n`;
  schemaSql += `  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,\n`;
  schemaSql += `  response JSONB,\n`;
  schemaSql += `  is_correct BOOLEAN,\n`;
  schemaSql += `  points NUMERIC NOT NULL DEFAULT 0,\n`;
  schemaSql += `  feedback TEXT,\n`;
  schemaSql += `  PRIMARY KEY (attempt_id, question_id)\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.reset_polls (\n`;
  schemaSql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  schemaSql += `  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,\n`;
  schemaSql += `  started_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,\n`;
  schemaSql += `  status TEXT NOT NULL DEFAULT 'open',\n`;
  schemaSql += `  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n`;
  schemaSql += `  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.reset_votes (\n`;
  schemaSql += `  poll_id UUID NOT NULL REFERENCES public.reset_polls(id) ON DELETE CASCADE,\n`;
  schemaSql += `  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,\n`;
  schemaSql += `  approve BOOLEAN NOT NULL,\n`;
  schemaSql += `  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n`;
  schemaSql += `  PRIMARY KEY (poll_id, user_id)\n`;
  schemaSql += `);\n\n`;

  schemaSql += `CREATE TABLE IF NOT EXISTS public.room_seen (\n`;
  schemaSql += `  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,\n`;
  schemaSql += `  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,\n`;
  schemaSql += `  section TEXT NOT NULL,\n`;
  schemaSql += `  seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n`;
  schemaSql += `  PRIMARY KEY (user_id, room_id, section)\n`;
  schemaSql += `);\n\n`;

  // 2. Data records
  let dataSql = `-- =====================================================================\n`;
  dataSql += `-- XOR Live Database Backup Data: ${today}\n`;
  dataSql += `-- Target: https://suctmauaolyuguusydwn.supabase.co\n`;
  dataSql += `-- =====================================================================\n\n`;

  const countsReport = {};

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`Error reading ${table}:`, error.message);
      continue;
    }
    countsReport[table] = data.length;
    if (data.length === 0) continue;

    dataSql += `-- Data for ${table} (${data.length} rows)\n`;
    const cols = Object.keys(data[0]);
    for (const row of data) {
      const vals = cols.map(c => sqlVal(row[c]));
      dataSql += `INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT DO NOTHING;\n`;
    }
    dataSql += `\n`;
  }

  // Write all 3 files
  fs.writeFileSync(schemaOut, schemaSql, "utf8");
  fs.writeFileSync(dataOut, dataSql, "utf8");
  fs.writeFileSync(fullOut, schemaSql + dataSql, "utf8");

  const fullStat = fs.statSync(fullOut);
  const schemaStat = fs.statSync(schemaOut);
  const dataStat = fs.statSync(dataOut);

  console.log("=== DUMP COMPLETE ===");
  console.log("Schema file:", schemaOut, `(${schemaStat.size} bytes)`);
  console.log("Data file:  ", dataOut, `(${dataStat.size} bytes)`);
  console.log("Full file:  ", fullOut, `(${fullStat.size} bytes)`);
  console.log("Row counts: ", JSON.stringify(countsReport, null, 2));
}

main().catch(console.error);
