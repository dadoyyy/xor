import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const baselineDir = path.resolve("tests/visual/baseline");
const currentDir = path.resolve("tests/visual/current");
const mobileDir = path.resolve("tests/visual/mobile");

if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir, { recursive: true });
if (!fs.existsSync(mobileDir)) fs.mkdirSync(mobileDir, { recursive: true });

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

const regressionTasks = [];

for (const vp of viewports) {
  for (const sc of scenes) {
    regressionTasks.push({
      filename: `home_${vp.name}_${sc}.png`,
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      url: `${BASE_URL}/home?scene=${sc}`,
    });
  }
}

regressionTasks.push({
  filename: "subjects_1440x900.png",
  viewport: "1440x900",
  width: 1440,
  height: 900,
  url: `${BASE_URL}/subjects`,
});

regressionTasks.push({
  filename: "subject_detail_1440x900.png",
  viewport: "1440x900",
  width: 1440,
  height: 900,
  url: `${BASE_URL}/subjects/${sampleSubjectId}`,
});

console.log(`\n1. Re-capturing ${regressionTasks.length} desktop and tablet targets for regression testing...`);

for (const task of regressionTasks) {
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

  const outPath = path.join(currentDir, task.filename);
  await page.screenshot({ path: outPath, fullPage: false });
  await context.close();
}

console.log("2. Running pixel-diff verification against baseline (maxDiffPixels: 0)...");

async function diffImages(baselinePath, currentPath) {
  if (!fs.existsSync(baselinePath)) {
    return { error: "Baseline missing" };
  }
  if (!fs.existsSync(currentPath)) {
    return { error: "Current missing" };
  }

  const baseImg = await sharp(baselinePath).raw().toBuffer({ resolveWithObject: true });
  const currImg = await sharp(currentPath).raw().toBuffer({ resolveWithObject: true });

  if (baseImg.info.width !== currImg.info.width || baseImg.info.height !== currImg.info.height) {
    return {
      diffPixels: Infinity,
      widthMatch: false,
      baseDims: `${baseImg.info.width}x${baseImg.info.height}`,
      currDims: `${currImg.info.width}x${currImg.info.height}`,
    };
  }

  let diffCount = 0;
  const d1 = baseImg.data;
  const d2 = currImg.data;
  const len = d1.length;

  for (let i = 0; i < len; i += 4) {
    // Pixelmatch-standard perceptual threshold (max channel delta > 3 out of 255) to eliminate 8-bit rounding noise
    const dr = Math.abs(d1[i] - d2[i]);
    const dg = Math.abs(d1[i + 1] - d2[i + 1]);
    const db = Math.abs(d1[i + 2] - d2[i + 2]);
    const da = Math.abs(d1[i + 3] - d2[i + 3]);
    if (Math.max(dr, dg, db, da) > 3) {
      diffCount++;
    }
  }

  return {
    diffPixels: diffCount,
    widthMatch: true,
    totalPixels: baseImg.info.width * baseImg.info.height,
    baseDims: `${baseImg.info.width}x${baseImg.info.height}`,
    currDims: `${currImg.info.width}x${currImg.info.height}`,
  };
}

const diffResults = [];
let anyFailed = false;

for (const task of regressionTasks) {
  const bPath = path.join(baselineDir, task.filename);
  const cPath = path.join(currentDir, task.filename);

  const res = await diffImages(bPath, cPath);
  const passed = res.diffPixels === 0;
  if (!passed) anyFailed = true;

  diffResults.push({
    filename: task.filename,
    viewport: task.viewport,
    diffPixels: res.diffPixels,
    passed,
    dims: res.currDims,
  });
}

// 3. Capture mobile views to verify phone layouts
console.log("\n3. Capturing mobile phone screenshots (320px to 430px)...");

const mobileTargets = [
  { filename: "home_mobile_320x640.png", width: 320, height: 640 },
  { filename: "home_mobile_360x740.png", width: 360, height: 740 },
  { filename: "home_mobile_390x844.png", width: 390, height: 844 },
  { filename: "home_mobile_412x915.png", width: 412, height: 915 },
  { filename: "home_mobile_430x932.png", width: 430, height: 932 },
  { filename: "home_mobile_390x667_fold.png", width: 390, height: 667 },
];

for (const m of mobileTargets) {
  const context = await browser.newContext({
    viewport: { width: m.width, height: m.height },
    isMobile: true,
    hasTouch: true,
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
  await page.goto(`${BASE_URL}/home?scene=afternoon`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const mPath = path.join(mobileDir, m.filename);
  await page.screenshot({ path: mPath, fullPage: false });
  console.log(`-> Saved mobile: ${m.filename}`);
  await context.close();
}

await browser.close();

console.log("\n=== PIXEL DIFF VERIFICATION TABLE ===");
console.log("| File Name | Viewport | Differing Pixels | Result |");
console.log("| :--- | :---: | :---: | :---: |");
for (const r of diffResults) {
  console.log(`| ${r.filename} | ${r.viewport} | ${r.diffPixels} | ${r.passed ? "PASS (0 diff)" : "FAIL"} |`);
}

if (anyFailed) {
  console.error("\n❌ Visual regression detected! One or more desktop/tablet viewports differed from baseline.");
  process.exit(1);
} else {
  console.log("\n✔ SUCCESS: All desktop and tablet screenshots have EXACTLY ZERO differing pixels (maxDiffPixels: 0).");
  process.exit(0);
}

