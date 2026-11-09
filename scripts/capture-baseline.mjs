import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const baselineDir = path.resolve("tests/visual/baseline");
if (!fs.existsSync(baselineDir)) {
  fs.mkdirSync(baselineDir, { recursive: true });
}

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

// Authenticate as dedicated test user "xor_automator"
const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

if (!profile) {
  console.error("Dedicated test user xor_automator not found!");
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

// Generate SSR cookies
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

console.log("Authenticated as:", profile.username);

// Get first subject ID for subject detail test
const { data: userSubjects } = await admin
  .from("subjects")
  .select("id")
  .limit(1);

const sampleSubjectId = userSubjects?.[0]?.id || "f42031ab-0937-4e8a-bddd-7a69233f0248";
console.log("Using sample subject ID:", sampleSubjectId);

const BASE_URL = "http://localhost:3000";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-lcd-text"],
});

const viewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
];

const scenes = ["afternoon", "morning", "evening"];

const baselineTasks = [];

for (const vp of viewports) {
  for (const sc of scenes) {
    baselineTasks.push({
      filename: `home_${vp.name}_${sc}.png`,
      width: vp.width,
      height: vp.height,
      url: `${BASE_URL}/home?scene=${sc}`,
    });
  }
}

// Also /subjects and one subject page at 1440x900
baselineTasks.push({
  filename: "subjects_1440x900.png",
  width: 1440,
  height: 900,
  url: `${BASE_URL}/subjects`,
});

baselineTasks.push({
  filename: "subject_detail_1440x900.png",
  width: 1440,
  height: 900,
  url: `${BASE_URL}/subjects/${sampleSubjectId}`,
});

console.log(`Starting baseline capture of ${baselineTasks.length} desktop/tablet screenshots...`);

for (const task of baselineTasks) {
  const context = await browser.newContext({
    viewport: { width: task.width, height: task.height },
    deviceScaleFactor: 1,
  });
  await context.addCookies(playwrightCookies);
  await context.addInitScript(() => {
    const style = document.createElement("style");
    style.id = "disable-animations";
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
      }
    `;
    document.documentElement.appendChild(style);
  });
  const page = await context.newPage();
  await page.goto(task.url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const outPath = path.join(baselineDir, task.filename);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`-> Saved baseline: ${task.filename}`);
  await context.close();
}

await browser.close();
console.log("All baseline screenshots captured successfully in tests/visual/baseline/!");
process.exit(0);

