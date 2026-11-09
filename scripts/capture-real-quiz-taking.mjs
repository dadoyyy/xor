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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userData.user.email,
});

const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anonClient.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
  type: "magiclink",
});

const cookiesToSet = [];
const ssr = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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

// Find subject and quiz
const { data: subject } = await admin
  .from("subjects")
  .select("id")
  .eq("owner_id", profile.id)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

const { data: quiz } = await admin
  .from("quizzes")
  .select("id")
  .eq("subject_id", subject.id)
  .limit(1)
  .single();

// Create a real in_progress attempt
const { data: inProgAttempt, error: attErr } = await admin
  .from("attempts")
  .insert({
    quiz_id: quiz.id,
    subject_id: subject.id,
    user_id: profile.id,
    status: "in_progress",
    epoch: 1,
    score: 0,
    max_score: 20,
    started_at: new Date().toISOString(),
  })
  .select()
  .single();

if (attErr || !inProgAttempt) {
  console.error("Failed to create in-progress attempt:", attErr);
  process.exit(1);
}

console.log("Created real in-progress attempt:", inProgAttempt.id);

const BASE_URL = "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

try {
  const context = await browser.newContext();
  await context.addCookies(playwrightCookies);

  const takeUrl = `${BASE_URL}/subjects/${subject.id}/quizzes/${quiz.id}/take/${inProgAttempt.id}`;

  // 1440x900
  const pageDesk = await context.newPage();
  await pageDesk.setViewportSize({ width: 1440, height: 900 });
  await pageDesk.goto(takeUrl, { waitUntil: "networkidle" });
  await pageDesk.waitForTimeout(600);
  await pageDesk.screenshot({
    path: path.join(ARTIFACT_DIR, "quiz_taking_1440x900.png"),
    fullPage: false,
  });
  console.log("Saved: quiz_taking_1440x900.png");
  await pageDesk.close();

  // 390x844
  const pageMob = await context.newPage();
  await pageMob.setViewportSize({ width: 390, height: 844 });
  await pageMob.goto(takeUrl, { waitUntil: "networkidle" });
  await pageMob.waitForTimeout(600);
  await pageMob.screenshot({
    path: path.join(ARTIFACT_DIR, "quiz_taking_390x844.png"),
    fullPage: false,
  });
  console.log("Saved: quiz_taking_390x844.png");
  await pageMob.close();
} finally {
  await browser.close();
}
