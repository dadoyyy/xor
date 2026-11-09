import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: automator } = await admin.from("profiles").select("id, username").eq("username", "xor_automator").single();
const { data: userData } = await admin.auth.admin.getUserById(automator.id);

const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userData.user.email,
});

const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
await anonClient.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });

// Now authenticated as xor_automator
const { data: subject } = await admin.from("subjects").select("id, name").eq("owner_id", automator.id).single();

// 1. Authenticated get_subject_share_key
const { data: shareKey, error: keyErr } = await anonClient.rpc("get_subject_share_key", {
  p_subject: subject.id,
});
console.log("1. Authenticated get_subject_share_key:", shareKey ? `PASS (${shareKey})` : `FAIL: ${keyErr?.message}`);

// 2. Pin / Unpin
const { error: pinErr } = await anonClient
  .from("library_entries")
  .update({ pinned: true })
  .eq("user_id", automator.id)
  .eq("subject_id", subject.id);
console.log("2. Pin toggle:", !pinErr ? "PASS" : `FAIL: ${pinErr.message}`);

// 3. Fork subject
const { data: forkRes, error: forkErr } = await anonClient.rpc("fork_subject", {
  p_subject_id: subject.id,
  p_new_name: "Forked Biology Copy",
});
console.log("3. Fork subject RPC:", forkRes ? `PASS (New ID: ${forkRes})` : `FAIL: ${forkErr?.message}`);

// Clean up forked test copy
if (forkRes) {
  await admin.from("subjects").delete().eq("id", forkRes);
  console.log("Cleaned up forked test subject.");
}

