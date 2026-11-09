import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const ARTIFACT_DIR = "C:/Users/Mark Anton Camoro/.gemini/antigravity/brain/418ee67f-d099-4d47-9181-c951c63120db";

// Read env without printing secrets
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

// Look up dedicated test user "xor_automator"
const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

if (!profile) {
  console.error("Dedicated test user xor_automator not found in remote DB!");
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

// Generate exact SSR cookies
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

console.log(`Generated session cookies for ${profile.username}`);

const BASE_URL = "http://localhost:3000";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

try {
  const context = await browser.newContext();
  await context.addCookies(playwrightCookies);

  const homeViewports = [
    { name: "home_1920x1080.png", width: 1920, height: 1080 },
    { name: "home_1440x900.png", width: 1440, height: 900 },
    { name: "home_1366x768.png", width: 1366, height: 768 },
    { name: "home_1024x768.png", width: 1024, height: 768 },
    { name: "home_768x1024.png", width: 768, height: 1024 },
    { name: "home_390x844.png", width: 390, height: 844 },
  ];

  for (const vp of homeViewports) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/home`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const outPath = path.join(ARTIFACT_DIR, vp.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot: ${vp.name} (${vp.width}x${vp.height})`);
    await page.close();
  }

  // Subjects page inside new shell
  const pageSubjects = await context.newPage();
  await pageSubjects.setViewportSize({ width: 1440, height: 900 });
  await pageSubjects.goto(`${BASE_URL}/subjects`, { waitUntil: "networkidle" });
  await pageSubjects.waitForTimeout(500);
  await pageSubjects.screenshot({
    path: path.join(ARTIFACT_DIR, "subjects_shell_1440x900.png"),
    fullPage: false,
  });
  console.log("Saved screenshot: subjects_shell_1440x900.png");

  // Mobile subjects page
  await pageSubjects.setViewportSize({ width: 390, height: 844 });
  await pageSubjects.goto(`${BASE_URL}/subjects`, { waitUntil: "networkidle" });
  await pageSubjects.waitForTimeout(500);
  await pageSubjects.screenshot({
    path: path.join(ARTIFACT_DIR, "subjects_shell_390x844.png"),
    fullPage: false,
  });
  console.log("Saved screenshot: subjects_shell_390x844.png");
  await pageSubjects.close();

  // Subject page with frame tabs
  const pageSubject = await context.newPage();
  await pageSubject.setViewportSize({ width: 1440, height: 900 });
  await pageSubject.goto(`${BASE_URL}/subjects/56eba5e8-fa27-4da4-a818-01634256e768`, {
    waitUntil: "networkidle",
  });
  await pageSubject.waitForTimeout(500);
  await pageSubject.screenshot({
    path: path.join(ARTIFACT_DIR, "subject_tabs_1440x900.png"),
    fullPage: false,
  });
  console.log("Saved screenshot: subject_tabs_1440x900.png");
  await pageSubject.close();

  console.log("All screenshots generated successfully!");
} catch (err) {
  console.error("Error during screenshots:", err);
} finally {
  await browser.close();
}

