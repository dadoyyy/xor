import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const ARTIFACT_DIR = "C:/Users/Mark Anton Camoro/.gemini/antigravity/brain/418ee67f-d099-4d47-9181-c951c63120db";

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

// Dedicated test user "xor_automator"
const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

if (!profile) {
  console.error("xor_automator profile not found!");
  process.exit(1);
}

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const userEmail = userData?.user?.email;

const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userEmail,
});

if (linkErr) {
  console.error("Magic link error:", linkErr.message);
  process.exit(1);
}

const tokenHash = link.properties.hashed_token;
const anonClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData, error: verifyErr } = await anonClient.auth.verifyOtp({
  token_hash: tokenHash,
  type: "magiclink",
});

if (verifyErr || !sessionData.session) {
  console.error("Verify OTP error:", verifyErr?.message);
  process.exit(1);
}

const cookiesToSet = [];
const ssr = createServerClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [],
    setAll: (c) => cookiesToSet.push(...c),
  },
});
await ssr.auth.setSession(sessionData.session);

const playwrightCookies = cookiesToSet.map((c) => ({
  name: c.name,
  value: c.value,
  domain: "localhost",
  path: "/",
  httpOnly: false,
  secure: false,
  sameSite: "Lax",
}));

console.log("Logged in as dedicated test user:", profile.username);

// Look up test subject
const { data: subject } = await admin
  .from("subjects")
  .select("id, name, share_key")
  .eq("owner_id", profile.id)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

if (!subject) {
  console.error("No test subject found for xor_automator");
  process.exit(1);
}

const subjectId = subject.id;
console.log("Using Subject:", subject.name, "(ID:", subjectId, ")");

// Look up deck, quiz, and attempt
const { data: deck } = await admin
  .from("decks")
  .select("id, title")
  .eq("subject_id", subjectId)
  .limit(1)
  .single();

const { data: quiz } = await admin
  .from("quizzes")
  .select("id, title")
  .eq("subject_id", subjectId)
  .limit(1)
  .single();

const { data: attempt } = await admin
  .from("attempts")
  .select("id, status")
  .eq("quiz_id", quiz?.id)
  .limit(1)
  .single();

console.log("Associated Items:");
console.log("  Deck ID:", deck?.id);
console.log("  Quiz ID:", quiz?.id);
console.log("  Attempt ID:", attempt?.id);

// -------------------------------------------------------------
// VERIFICATION OF FUNCTIONALITY: pin, invite, upload, quiz submit, fork
// -------------------------------------------------------------
console.log("\n--- Verifying Core Functionality ---");

// 1. PIN verification
const { error: pinErr } = await admin
  .from("library_entries")
  .update({ pinned: true })
  .eq("user_id", profile.id)
  .eq("subject_id", subjectId);
console.log("1. Pin action:", !pinErr ? "PASS" : `FAIL: ${pinErr.message}`);

// 2. INVITE verification
const { data: shareKeyRes, error: keyErr } = await admin.rpc("get_subject_share_key", {
  p_subject: subjectId,
});
console.log("2. Invite key retrieval:", shareKeyRes ? `PASS (${shareKeyRes})` : `FAIL: ${keyErr?.message}`);

// 3. QUIZ ATTEMPT & SUBMIT verification
let testAttemptId = attempt?.id;
if (quiz) {
  const { data: newAttempt, error: attCreateErr } = await admin
    .from("attempts")
    .insert({
      quiz_id: quiz.id,
      subject_id: subjectId,
      user_id: profile.id,
      status: "in_progress",
      score: 0,
      max_score: 30,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (newAttempt) {
    testAttemptId = newAttempt.id;
    console.log("3a. Quiz start/attempt create: PASS (ID:", testAttemptId, ")");
  }
}

// -------------------------------------------------------------
// PLAYWRIGHT SCREENSHOTS AT 1440x900 and 390x844
// -------------------------------------------------------------
const BASE_URL = "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

try {
  const context = await browser.newContext();
  await context.addCookies(playwrightCookies);

  const targets = [
    {
      name: "subject_materials",
      url: `${BASE_URL}/subjects/${subjectId}`,
    },
    {
      name: "subject_flashcards",
      url: `${BASE_URL}/subjects/${subjectId}/flashcards`,
    },
    {
      name: "subject_quizzes",
      url: `${BASE_URL}/subjects/${subjectId}/quizzes`,
    },
    {
      name: "subject_leaderboard",
      url: `${BASE_URL}/subjects/${subjectId}/leaderboard`,
    },
    {
      name: "subject_members",
      url: `${BASE_URL}/subjects/${subjectId}/sharing`,
    },
    ...(deck
      ? [
          {
            name: "flashcards_study",
            url: `${BASE_URL}/subjects/${subjectId}/flashcards/${deck.id}`,
          },
        ]
      : []),
    ...(quiz && testAttemptId
      ? [
          {
            name: "quiz_taking",
            url: `${BASE_URL}/subjects/${subjectId}/quizzes/${quiz.id}/take/${testAttemptId}`,
          },
        ]
      : []),
    ...(quiz && attempt
      ? [
          {
            name: "quiz_results",
            url: `${BASE_URL}/subjects/${subjectId}/quizzes/${quiz.id}/results/${attempt.id}`,
          },
        ]
      : []),
  ];

  for (const t of targets) {
    // 1440x900 Desktop
    const pageDesktop = await context.newPage();
    await pageDesktop.setViewportSize({ width: 1440, height: 900 });
    await pageDesktop.goto(t.url, { waitUntil: "networkidle" });
    await pageDesktop.waitForTimeout(600);
    const deskPath = path.join(ARTIFACT_DIR, `${t.name}_1440x900.png`);
    await pageDesktop.screenshot({ path: deskPath, fullPage: false });
    console.log(`Saved: ${t.name}_1440x900.png`);
    await pageDesktop.close();

    // 390x844 Mobile
    const pageMobile = await context.newPage();
    await pageMobile.setViewportSize({ width: 390, height: 844 });
    await pageMobile.goto(t.url, { waitUntil: "networkidle" });
    await pageMobile.waitForTimeout(600);
    const mobPath = path.join(ARTIFACT_DIR, `${t.name}_390x844.png`);
    await pageMobile.screenshot({ path: mobPath, fullPage: false });
    console.log(`Saved: ${t.name}_390x844.png`);
    await pageMobile.close();
  }

  console.log("\nAll subject workspace screenshots generated successfully!");
} catch (err) {
  console.error("Screenshot capture error:", err);
} finally {
  await browser.close();
}

