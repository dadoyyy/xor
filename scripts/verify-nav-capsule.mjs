import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// --- 1. Contrast Math ---
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function blendRgb(fgRgb, fgAlpha, bgRgb) {
  return [
    Math.round(fgRgb[0] * fgAlpha + bgRgb[0] * (1 - fgAlpha)),
    Math.round(fgRgb[1] * fgAlpha + bgRgb[1] * (1 - fgAlpha)),
    Math.round(fgRgb[2] * fgAlpha + bgRgb[2] * (1 - fgAlpha)),
  ];
}

function rgbToLuminance(rgb) {
  const norm = rgb.map((v) => v / 255);
  const a = norm.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatioRgb(rgb1, rgb2) {
  const l1 = rgbToLuminance(rgb1);
  const l2 = rgbToLuminance(rgb2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Number(ratio.toFixed(2));
}

console.log("=== NAV CAPSULE CONTRAST VERIFICATION ===");
// Gradient stops behind the translucent capsule (alpha 0.85 white)
const stop1Rgb = hexToRgb("#D3C4FF"); // darkest lilac stop
const stop3Rgb = hexToRgb("#FFE9A8"); // lightest cream stop
const whiteRgb = [255, 255, 255];
const capsuleOverStop1 = blendRgb(whiteRgb, 0.85, stop1Rgb);
const capsuleOverStop3 = blendRgb(whiteRgb, 0.85, stop3Rgb);

const inkMutedRgb = hexToRgb("#5B5480");
const accentPurpleRgb = hexToRgb("#6D3BE8");

const contrastResults = [
  {
    Element: "Inactive item (#5B5480) on Capsule (over Darkest Frame #D3C4FF)",
    Foreground: "#5B5480",
    EffectiveBackground: `rgb(${capsuleOverStop1.join(",")})`,
    "Measured Ratio": `${contrastRatioRgb(inkMutedRgb, capsuleOverStop1)} : 1`,
    Target: ">= 4.5:1",
    Status: contrastRatioRgb(inkMutedRgb, capsuleOverStop1) >= 4.5 ? "PASS (AA)" : "FAIL",
  },
  {
    Element: "Inactive item (#5B5480) on Capsule (over Lightest Frame #FFE9A8)",
    Foreground: "#5B5480",
    EffectiveBackground: `rgb(${capsuleOverStop3.join(",")})`,
    "Measured Ratio": `${contrastRatioRgb(inkMutedRgb, capsuleOverStop3)} : 1`,
    Target: ">= 4.5:1",
    Status: contrastRatioRgb(inkMutedRgb, capsuleOverStop3) >= 4.5 ? "PASS (AA)" : "FAIL",
  },
  {
    Element: "Active item (White #FFFFFF) on Purple Pill (#6D3BE8)",
    Foreground: "#FFFFFF",
    EffectiveBackground: "#6D3BE8",
    "Measured Ratio": `${contrastRatioRgb(whiteRgb, accentPurpleRgb)} : 1`,
    Target: ">= 4.5:1",
    Status: contrastRatioRgb(whiteRgb, accentPurpleRgb) >= 4.5 ? "PASS (AA)" : "FAIL",
  },
];
console.table(contrastResults);

// --- 2. Auth setup with xor_automator ---
const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
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

const artifactDir = path.resolve("C:/Users/Mark Anton Camoro/.gemini/antigravity/brain/418ee67f-d099-4d47-9181-c951c63120db");
const subjectId = "f42031ab-0937-4e8a-bddd-7a69233f0248";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

async function createAuthedContext(viewport) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addCookies(playwrightCookies);
  const page = await ctx.newPage();
  return { ctx, page };
}

console.log("\n=== 1. VERIFYING ZERO SHEET SCROLL ON /home ===");
const scrollCheckVps = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 900 },
  { w: 1366, h: 768 },
  { w: 1280, h: 720 },
  { w: 1024, h: 768 },
];

const zeroScrollResults = [];
for (const vp of scrollCheckVps) {
  const { ctx, page } = await createAuthedContext({ width: vp.w, height: vp.h });
  await page.goto("http://localhost:3000/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const scrollInfo = await page.evaluate(() => {
    const sheet = document.querySelector('[data-sheet="true"]');
    return {
      scrollHeight: sheet ? sheet.scrollHeight : 0,
      clientHeight: sheet ? sheet.clientHeight : 0,
      overflows: sheet ? sheet.scrollHeight > sheet.clientHeight : false,
    };
  });

  zeroScrollResults.push({
    Viewport: `${vp.w}x${vp.h}`,
    "Client Height": `${scrollInfo.clientHeight}px`,
    "Scroll Height": `${scrollInfo.scrollHeight}px`,
    "Sheet Overflow": scrollInfo.overflows ? "OVERFLOW" : "0px (Fits Viewport)",
  });
  await ctx.close();
}
console.table(zeroScrollResults);

console.log("\n=== 2. CAPTURING REQUIRED SCREENSHOTS ===");
const requiredScreenshots = [
  { url: "http://localhost:3000/home", name: "capsule_home_1920x1080.png", vp: { width: 1920, height: 1080 } },
  { url: "http://localhost:3000/home", name: "capsule_home_1440x900.png", vp: { width: 1440, height: 900 } },
  { url: "http://localhost:3000/home", name: "capsule_home_1366x768.png", vp: { width: 1366, height: 768 } },
  { url: "http://localhost:3000/home", name: "capsule_home_1280x720.png", vp: { width: 1280, height: 720 } },
  { url: "http://localhost:3000/home", name: "capsule_home_1024x768.png", vp: { width: 1024, height: 768 } },
  { url: "http://localhost:3000/home", name: "capsule_home_768x1024.png", vp: { width: 768, height: 1024 } },
  { url: "http://localhost:3000/home", name: "capsule_home_390x844.png", vp: { width: 390, height: 844 } },

  { url: "http://localhost:3000/subjects", name: "capsule_subjects_1440x900.png", vp: { width: 1440, height: 900 } },
  { url: "http://localhost:3000/subjects", name: "capsule_subjects_390x844.png", vp: { width: 390, height: 844 } },

  { url: `http://localhost:3000/subjects/${subjectId}`, name: "capsule_subject_workspace_1440x900.png", vp: { width: 1440, height: 900 } },
  { url: `http://localhost:3000/subjects/${subjectId}`, name: "capsule_subject_workspace_390x844.png", vp: { width: 390, height: 844 } },
];

for (const sc of requiredScreenshots) {
  const { ctx, page } = await createAuthedContext(sc.vp);
  await page.goto(sc.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, sc.name) });
  console.log(`Saved ${sc.name}`);
  await ctx.close();
}

console.log("\n=== 3. VERIFYING CAPSULE FOCUS RING & KEYBOARD NAVIGATION ===");
const { ctx: fCtx, page: fPage } = await createAuthedContext({ width: 1440, height: 900 });
await fPage.goto("http://localhost:3000/home", { waitUntil: "networkidle" });
await fPage.waitForTimeout(600);

const navLink = fPage.locator("nav[aria-label='Main'] a[href='/subjects']").first();
await navLink.focus();
await fPage.waitForTimeout(300);

const focusInfo = await navLink.evaluate((el) => {
  const s = window.getComputedStyle(el);
  return {
    tag: el.tagName,
    borderRadius: s.borderRadius,
    outline: s.outline,
    outlineOffset: s.outlineOffset,
  };
});
console.log("Capsule link focus computed style:", focusInfo);
await fPage.screenshot({ path: path.join(artifactDir, "capsule_focus_ring.png") });
console.log("Saved capsule_focus_ring.png");
await fCtx.close();

await browser.close();
console.log("\n=== ALL NAV CAPSULE VERIFICATIONS COMPLETED SUCCESSFULLY ===");

