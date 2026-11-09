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

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userData.user.email,
});

const anonClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anonClient.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
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

const context = await browser.newContext();
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

const viewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "390x844", width: 390, height: 844 },
];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto("http://localhost:3000/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  if (vp.name === "1366x768") {
    const scrollInfo = await page.evaluate(() => {
      const sheet = document.querySelector('[data-sheet="true"] > div') || document.querySelector('[data-sheet="true"]');
      return {
        windowHeight: window.innerHeight,
        sheetScrollHeight: sheet.scrollHeight,
        sheetClientHeight: sheet.clientHeight,
        hasVerticalScroll: sheet.scrollHeight > sheet.clientHeight + 2,
      };
    });
    console.log("1366x768 Sheet Scroll Info:", scrollInfo);
  }

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, `capsule_redesign_home_${vp.name}.png`),
    fullPage: false,
  });
}

// Closeup of sidebar capsule on 1440x900
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/home", { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const capsuleLocator = page.locator("nav.nav-capsule-desktop");
if (await capsuleLocator.count() > 0) {
  await capsuleLocator.screenshot({
    path: path.join(ARTIFACT_DIR, "capsule_redesign_closeup_1440x900.png"),
  });
}

// Hover state on Calendar
const calendarItem = page.locator('nav.nav-capsule-desktop a:has-text("Calendar")');
if (await calendarItem.count() > 0) {
  await calendarItem.hover();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "capsule_redesign_hover_1440x900.png"),
    fullPage: false,
  });
}

// Keyboard focus state
await page.keyboard.press("Tab");
await page.keyboard.press("Tab"); // moves to first nav item
await page.waitForTimeout(200);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "capsule_redesign_focus_1440x900.png"),
  fullPage: false,
});

// /subjects at 1440x900
await page.goto("http://localhost:3000/subjects", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "capsule_redesign_subjects_1440x900.png"),
  fullPage: false,
});

// /subjects at 390x844
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "capsule_redesign_subjects_390x844.png"),
  fullPage: false,
});

// Nested subject page at 1440x900
const testSubjectId = "f42031ab-0937-4e8a-bddd-7a69233f0248";
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`http://localhost:3000/subjects/${testSubjectId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "capsule_redesign_nested_subject_1440x900.png"),
  fullPage: false,
});

// Nested subject page at 390x844
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "capsule_redesign_nested_subject_390x844.png"),
  fullPage: false,
});

await browser.close();
console.log("Capsule redesign screenshots captured successfully!");

