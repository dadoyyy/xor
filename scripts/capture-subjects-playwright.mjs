import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

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

// Authenticate as test user "xorreur"
const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xorreur")
  .single();

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const userEmail = userData?.user?.email;

const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userEmail,
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

const playwrightCookies = cookiesToSet.map((c) => ({
  name: c.name,
  value: c.value,
  domain: "localhost",
  path: "/",
  httpOnly: false,
  secure: false,
  sameSite: "Lax",
}));

const artifactDir = "C:\\Users\\Mark Anton Camoro\\.gemini\\antigravity\\brain\\418ee67f-d099-4d47-9181-c951c63120db";
const desktopPng = path.join(artifactDir, "subjects_1440x900.png");
const mobilePng = path.join(artifactDir, "subjects_390x844.png");

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

// 1. Capture Desktop 1440x900
console.log("Capturing Desktop 1440x900 with card menu open...");
const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await desktopContext.addCookies(playwrightCookies);
const desktopPage = await desktopContext.newPage();
await desktopPage.goto("http://localhost:3000/subjects", { waitUntil: "networkidle" });
await desktopPage.waitForSelector('main [role="tablist"]', { state: "visible", timeout: 15000 });

// Find the first subject card and click its options button
const firstCardMenuBtn = desktopPage.locator('button[aria-label^="Options for"]').first();
if (await firstCardMenuBtn.count()) {
  await firstCardMenuBtn.click();
  await desktopPage.waitForSelector('[role="menu"]', { state: "visible", timeout: 5000 });
}

await desktopPage.screenshot({ path: desktopPng });
console.log("Desktop screenshot saved to:", desktopPng);

// 2. Capture Mobile 390x844
console.log("Capturing Mobile 390x844 with card menu open...");
const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobileContext.addCookies(playwrightCookies);
const mobilePage = await mobileContext.newPage();
await mobilePage.goto("http://localhost:3000/subjects", { waitUntil: "networkidle" });
await mobilePage.waitForSelector('main [role="tablist"]', { state: "visible", timeout: 15000 });

// Find the first subject card and click its options button
const mobileCardMenuBtn = mobilePage.locator('button[aria-label^="Options for"]').first();
if (await mobileCardMenuBtn.count()) {
  await mobileCardMenuBtn.click();
  await mobilePage.waitForSelector('[role="menu"]', { state: "visible", timeout: 5000 });
}

await mobilePage.screenshot({ path: mobilePng });
console.log("Mobile screenshot saved to:", mobilePng);

await browser.close();
console.log("All screenshots successfully captured!");

