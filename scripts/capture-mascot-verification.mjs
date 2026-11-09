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

// Dedicated test account: xor_automator
const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("id", "222bbdcb-7e1b-4e16-9bb0-1be263b02855")
  .single();

if (!profile) {
  throw new Error("Could not find xor_automator profile");
}

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const userEmail = userData?.user?.email;

const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userEmail,
});

const tokenHash = link.properties.hashed_token;
const anonClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anonClient.auth.verifyOtp({
  token_hash: tokenHash,
  type: "magiclink",
});

const cookiesToSet = [];
const ssr = createServerClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [],
    setAll: (c) => cookiesToSet.push(...c),
  },
});
await ssr.auth.setSession(sessionData.session);

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});

await context.addCookies(
  cookiesToSet.map((c) => ({
    name: c.name,
    value: c.value,
    domain: "localhost",
    path: "/",
    httpOnly: c.options?.httpOnly ?? false,
    secure: c.options?.secure ?? false,
    sameSite: "Lax",
  }))
);

const page = await context.newPage();

// 1. Check /home at 1440x900
await page.goto("http://localhost:3000/home", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "mascot_home_1440x900.png"),
  fullPage: false,
});

// Check sheet scrolling on /home at 1366x768
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForTimeout(500);

const scrollInfo = await page.evaluate(() => {
  const sheet = document.querySelector(".app-sheet") || document.querySelector("main") || document.body;
  return {
    windowHeight: window.innerHeight,
    sheetScrollHeight: sheet.scrollHeight,
    sheetClientHeight: sheet.clientHeight,
    hasVerticalScroll: sheet.scrollHeight > sheet.clientHeight + 2,
  };
});
console.log("1366x768 Scroll Info:", scrollInfo);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "mascot_home_1366x768.png"),
  fullPage: false,
});

// Closeup of bottom cards (Study Streak, Activity, Heatmap)
const bottomRow = page.locator("section.grid.grid-cols-1.md\\:grid-cols-3");
if (await bottomRow.count() > 0) {
  await bottomRow.screenshot({
    path: path.join(ARTIFACT_DIR, "mascot_bottom_cards_closeup.png"),
  });
}

// 2. Mobile 390x844
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "mascot_home_390x844.png"),
  fullPage: false,
});

// 3. /subjects
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/subjects", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "mascot_subjects_1440x900.png"),
  fullPage: false,
});

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "mascot_subjects_390x844.png"),
  fullPage: false,
});

// 4. /calendar
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/calendar", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "mascot_calendar_1440x900.png"),
  fullPage: false,
});

// 5. /progress
await page.goto("http://localhost:3000/progress", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "mascot_progress_1440x900.png"),
  fullPage: false,
});

await browser.close();
console.log("Screenshots captured successfully!");

