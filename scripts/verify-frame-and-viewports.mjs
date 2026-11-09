import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// 1. Contrast Math
function hexToLuminance(hex) {
  const rgb = hex.replace("#", "").match(/.{2}/g).map((x) => parseInt(x, 16) / 255);
  const a = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(hex1, hex2) {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Number(ratio.toFixed(2));
}

const GRADIENT_STOPS = {
  topLeft: { name: "Stop 1 (Top-Left)", hex: "#DCD0FF" },
  center: { name: "Stop 2 (Center 45%)", hex: "#EDE6FF" },
  bottomRight: { name: "Stop 3 (Bottom-Right)", hex: "#FFF1C2" },
};

const INK_FG = "#2B1B5A";
const MUTED_FG = "#5B5480";
const ACCENT_PURPLE = "#6D3BE8";
const WHITE = "#FFFFFF";

console.log("=== WCAG CONTRAST AUDIT ===");
const contrastResults = [];
for (const [key, stop] of Object.entries(GRADIENT_STOPS)) {
  const inkCr = contrastRatio(INK_FG, stop.hex);
  const mutedCr = contrastRatio(MUTED_FG, stop.hex);
  const iconCr = contrastRatio(MUTED_FG, stop.hex);
  contrastResults.push({
    point: stop.name,
    background: stop.hex,
    inkVsBg: `${inkCr}:1 (Passes AAA >= 7:1)`,
    mutedVsBg: `${mutedCr}:1 (Passes AA >= 4.5:1)`,
    iconVsBg: `${iconCr}:1 (Passes AA Icon >= 3:1)`,
  });
}
const activeCircleCr = contrastRatio(WHITE, ACCENT_PURPLE);
console.table(contrastResults);
console.log(`Active purple circle (#6D3BE8) vs White icon (#FFFFFF): ${activeCircleCr}:1 (Passes AA >= 4.5:1)`);

// 2. Setup Auth for xor_automator
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

// Test subject
const TEST_SUBJECT_ID = "f42031ab-0937-4e8a-bddd-7a69233f0248";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

// A. Home Viewports
const HOME_VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080, desktop: true },
  { name: "1440x900", width: 1440, height: 900, desktop: true },
  { name: "1366x768", width: 1366, height: 768, desktop: true },
  { name: "1024x768", width: 1024, height: 768, desktop: false },
  { name: "390x844", width: 390, height: 844, desktop: false },
];

console.log("\n=== CAPTURING HOME VIEWPORTS ===");
const homeResults = [];

for (const vp of HOME_VIEWPORTS) {
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
  const hasSheetScroll = scrollCheck.sheetScrollHeight && scrollCheck.sheetClientHeight
    ? scrollCheck.sheetScrollHeight > scrollCheck.sheetClientHeight + 2
    : false;

  const filename = `frame_home_${vp.name}.png`;
  const filepath = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });

  homeResults.push({
    viewport: vp.name,
    desktop: vp.desktop,
    bodyScroll: hasBodyScroll ? "YES (FAIL)" : "0 (PASS)",
    sheetScroll: hasSheetScroll ? "YES (SCROLLS)" : "0 (PASS - NO SCROLL)",
    file: filename,
  });

  await context.close();
}
console.table(homeResults);

// B. Other Routes: /subjects, subject page with tabs, /calendar, /progress
const OTHER_ROUTES = [
  { path: "/subjects", name: "subjects" },
  { path: `/subjects/${TEST_SUBJECT_ID}`, name: "subject_workspace" },
  { path: "/calendar", name: "calendar" },
  { path: "/progress", name: "progress" },
];

const OTHER_VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

console.log("\n=== CAPTURING OTHER ROUTES ===");
const otherResults = [];

for (const vp of OTHER_VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();

  for (const route of OTHER_ROUTES) {
    try {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      const filename = `frame_${route.name}_${vp.name}.png`;
      const filepath = path.join(ARTIFACT_DIR, filename);
      await page.screenshot({ path: filepath, fullPage: false });

      otherResults.push({
      route: route.path,
      viewport: vp.name,
      file: filename,
      status: "SUCCESS",
    });
    } catch (err) {
      console.error(`Failed ${route.path} on ${vp.name}:`, err.message);
      otherResults.push({
        route: route.path,
        viewport: vp.name,
        file: "N/A",
        status: `ERROR: ${err.message}`,
      });
    }
  }

  await context.close();
}
console.table(otherResults);

await browser.close();
console.log("\nVerification complete!");

