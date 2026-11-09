import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

if (!profile) throw new Error("xor_automator not found");

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

const playwrightCookies = cookiesToSet.map((c) => ({
  name: c.name,
  value: c.value,
  domain: "localhost",
  path: "/",
  httpOnly: false,
  secure: false,
  sameSite: "Lax",
}));

const BASE_URL = "http://localhost:3000";
const ARTIFACT_DIR = "C:/Users/Mark Anton Camoro/.gemini/antigravity/brain/418ee67f-d099-4d47-9181-c951c63120db";

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
];

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

const results = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/home`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-home-hero='true']", { timeout: 15000 });
  await page.waitForTimeout(1000);

  const scrollCheck = await page.evaluate(() => {
    const mainSheet = document.querySelector("main") || document.querySelector("[data-sheet='true']");
    const scrollContainer = mainSheet ? mainSheet.querySelector(".overflow-y-auto") || mainSheet : null;
    return {
      windowHeight: window.innerHeight,
      bodyScrollHeight: document.body.scrollHeight,
      sheetClientHeight: scrollContainer ? scrollContainer.clientHeight : null,
      sheetScrollHeight: scrollContainer ? scrollContainer.scrollHeight : null,
    };
  });

  const hasBodyScroll = scrollCheck.bodyScrollHeight > scrollCheck.windowHeight;
  const hasSheetScroll =
    scrollCheck.sheetScrollHeight && scrollCheck.sheetClientHeight
      ? scrollCheck.sheetScrollHeight > scrollCheck.sheetClientHeight + 2
      : false;

  const filename = `restored_streak_${vp.name}.png`;
  const filepath = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });

  results.push({
    viewport: vp.name,
    windowHeight: scrollCheck.windowHeight,
    sheetClientHeight: scrollCheck.sheetClientHeight,
    sheetScrollHeight: scrollCheck.sheetScrollHeight,
    bodyScroll: hasBodyScroll ? "YES (FAIL)" : "0 (PASS)",
    sheetScroll: hasSheetScroll ? "YES (SCROLLS)" : "0 (PASS - NO SCROLL)",
    file: filename,
  });

  await context.close();
}

console.table(results);
await browser.close();

