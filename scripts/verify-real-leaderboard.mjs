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
  console.log("=== VERIFYING REAL LEADERBOARD DATA ACROSS ALL SUBJECTS ===");

  const { data: subjects, error: subjErr } = await supabase.from("subjects").select("id, name, leaderboard_epoch");
  if (subjErr) {
    console.error("Failed to fetch subjects:", subjErr.message);
    return;
  }

  for (const s of subjects) {
    console.log(`\nSubject: "${s.name}" (${s.id}) - Season Epoch: ${s.leaderboard_epoch}`);
    
    // Check attempts in this subject
    const { data: attempts } = await supabase
      .from("attempts")
      .select("id, user_id, counts, score, max_score, epoch, status")
      .eq("subject_id", s.id);
    console.log(`  Total attempts: ${attempts?.length || 0}`);
    attempts?.forEach(a => console.log(`    Attempt: score=${a.score}/${a.max_score}, counts=${a.counts}, status=${a.status}, epoch=${a.epoch}`));

    // Call subject_leaderboard RPC
    const { data: lb, error: lbErr } = await supabase.rpc("subject_leaderboard", { p_subject: s.id });
    if (lbErr) {
      console.log(`  RPC Error: ${lbErr.message}`);
    } else {
      console.log(`  Leaderboard rows (${lb.length}):`);
      lb.forEach(row => {
        console.log(`    Rank ${row.rank}: ${row.username} | Points: ${row.total_points} | Quizzes: ${row.quizzes_taken} | Avg: ${row.avg_percent}%`);
      });
    }

    // Check members and their roles
    const { data: members } = await supabase
      .from("library_entries")
      .select("user_id, role, profiles(username)")
      .eq("subject_id", s.id);
    console.log(`  Members (${members?.length || 0}):`);
    members?.forEach(m => console.log(`    Role: ${m.role} - ${m.profiles?.username}`));
  }
}

main().catch(console.error);
