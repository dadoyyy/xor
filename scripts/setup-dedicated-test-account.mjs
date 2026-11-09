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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_USERNAME = "xor_automator";
const TEST_EMAIL = "xor_automator@example.internal";

console.log("Setting up dedicated test user:", TEST_USERNAME);

// 1. Check if user already exists in auth.users
const { data: usersData, error: listErr } = await admin.auth.admin.listUsers();
if (listErr) {
  console.error("Failed to list users:", listErr.message);
  process.exit(1);
}

let testUser = usersData.users.find(
  (u) => u.email === TEST_EMAIL || u.user_metadata?.username === TEST_USERNAME
);

if (!testUser) {
  console.log("Creating new dedicated test user in Supabase Auth...");
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: "TestPassword123!Secure",
    email_confirm: true,
    user_metadata: { username: TEST_USERNAME },
  });

  if (createErr || !created.user) {
    console.error("Failed to create test user:", createErr?.message);
    process.exit(1);
  }
  testUser = created.user;
  console.log("Created auth user:", testUser.id);
} else {
  console.log("Found existing dedicated test auth user:", testUser.id);
}

// 2. Ensure profile exists and has username
const { data: profile, error: profErr } = await admin
  .from("profiles")
  .select("id, username")
  .eq("id", testUser.id)
  .maybeSingle();

if (!profile) {
  console.log("Upserting profile for test user...");
  const { error: upsertErr } = await admin.from("profiles").upsert({
    id: testUser.id,
    username: TEST_USERNAME,
    updated_at: new Date().toISOString(),
  });
  if (upsertErr) {
    console.error("Failed to upsert profile:", upsertErr.message);
    process.exit(1);
  }
} else if (profile.username !== TEST_USERNAME) {
  await admin.from("profiles").update({ username: TEST_USERNAME }).eq("id", testUser.id);
}

console.log("Dedicated test account ready:");
console.log(`  ID: ${testUser.id}`);
console.log(`  Username: ${TEST_USERNAME}`);
console.log(`  Email: ${TEST_EMAIL}`);

