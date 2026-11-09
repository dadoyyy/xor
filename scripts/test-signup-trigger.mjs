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
  console.log("=== TESTING SIGNUP TRIGGER ON REMOTE SUPABASE ===");

  const testEmail = `test_verification_${Date.now()}@test.internal`;
  const testPassword = `TestP@ss_${Date.now()}!Aa`;

  console.log("1. Creating temporary test user via auth.admin.createUser...");
  const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });

  if (createErr) {
    console.error("Failed to create test user:", createErr.message);
    return;
  }

  const userId = createData.user.id;
  console.log("Test user created with ID:", userId);

  // 2. Check if a profile row was automatically created by a trigger
  const { data: profileRow, error: profErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  console.log("Profile query result:", profileRow ? "PROFILE EXISTS" : "PROFILE NOT FOUND");
  if (profErr) {
    console.log("Profile query error:", profErr.message);
  }

  // 3. Test set_my_username with a user client session
  let usernameResult = null;
  if (profileRow) {
    console.log("3. Logging in as test user to test set_my_username...");
    const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInErr) {
      console.log("Sign in error:", signInErr.message);
    } else {
      const targetUsername = `test_usr_${Date.now().toString().slice(-6)}`;
      const { data: rpcRes, error: rpcErr } = await userClient.rpc("set_my_username", {
        p_username: targetUsername
      });

      if (rpcErr) {
        usernameResult = `RPC Error: ${rpcErr.message}`;
      } else {
        usernameResult = `SUCCESS: username set to '${rpcRes}'`;
      }
    }
  }

  // 4. Clean up test user
  console.log("4. Cleaning up test user...");
  const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error("Failed to delete test user:", delErr.message);
  } else {
    console.log("Test user cleaned up successfully.");
  }

  console.log("\n=== SUMMARY ===");
  console.log("Trigger on auth.users status:", profileRow ? "ACTIVE (profile automatically created)" : "MISSING (no profile created)");
  console.log("set_my_username status:", usernameResult);
}

main().catch(console.error);

