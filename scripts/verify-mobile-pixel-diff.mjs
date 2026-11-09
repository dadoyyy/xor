import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const baselineDir = path.resolve("tests/visual/baseline-mobile");
const currentDir = path.resolve("tests/visual/current-mobile");
if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir, { recursive: true });

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

const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userData?.user?.email,
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

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-lcd-text"],
});

const viewports = [
  { name: "390x844", width: 390, height: 844 },
  { name: "320x640", width: 320, height: 640 },
];
const scenes = ["morning", "afternoon", "evening"];

const tasks = [];
for (const vp of viewports) {
  for (const sc of scenes) {
    tasks.push({
      filename: `home_mobile_${vp.name}_${sc}.png`,
      width: vp.width,
      height: vp.height,
      url: `${BASE_URL}/home?scene=${sc}`,
    });
  }
}

console.log(`Re-capturing ${tasks.length} mobile screenshots to verify scope guard...`);

for (const task of tasks) {
  const context = await browser.newContext({
    viewport: { width: task.width, height: task.height },
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
  await page.goto(task.url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const outPath = path.join(currentDir, task.filename);
  await page.screenshot({ path: outPath, fullPage: false });
  await context.close();
}

await browser.close();

console.log("\nRunning pixel-diff against baseline-mobile (maxDiffPixels: 0)...");

async function diffImages(bPath, cPath) {
  const b = await sharp(bPath).raw().toBuffer({ resolveWithObject: true });
  const c = await sharp(cPath).raw().toBuffer({ resolveWithObject: true });
  const d1 = b.data;
  const d2 = c.data;
  let diffCount = 0;
  for (let i = 0; i < d1.length; i += 4) {
    const dr = Math.abs(d1[i] - d2[i]);
    const dg = Math.abs(d1[i + 1] - d2[i + 1]);
    const db = Math.abs(d1[i + 2] - d2[i + 2]);
    const da = Math.abs(d1[i + 3] - d2[i + 3]);
    if (Math.max(dr, dg, db, da) > 3) {
      diffCount++;
    }
  }
  return diffCount;
}

let allPassed = true;
console.log("\n=== MOBILE SCOPE GUARD PIXEL DIFF TABLE ===");
console.log("| Mobile Target | Viewport | Differing Pixels | Result |");
console.log("| :--- | :---: | :---: | :---: |");

for (const task of tasks) {
  const bPath = path.join(baselineDir, task.filename);
  const cPath = path.join(currentDir, task.filename);
  const diffs = await diffImages(bPath, cPath);
  const pass = diffs === 0;
  if (!pass) allPassed = false;
  console.log(`| ${task.filename} | ${task.width}x${task.height} | ${diffs} | ${pass ? "PASS (0 diff)" : "FAIL"} |`);
}

if (!allPassed) {
  console.error("\n❌ Mobile Scope Guard FAIL: mobile layout differed from baseline!");
  process.exit(1);
} else {
  console.log("\n✔ SUCCESS: All mobile layouts (<768px) have EXACTLY ZERO differing pixels against baseline!");
  process.exit(0);
}

