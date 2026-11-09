import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const mobileBaselineDir = path.resolve("tests/visual/baseline-mobile");
if (!fs.existsSync(mobileBaselineDir)) {
  fs.mkdirSync(mobileBaselineDir, { recursive: true });
}

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

if (!profile) {
  console.error("xor_automator not found");
  process.exit(1);
}

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userData?.user?.email,
});
if (linkErr) {
  console.error("Magic link err:", linkErr.message);
  process.exit(1);
}

const anonClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData, error: verifyErr } = await anonClient.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
  type: "magiclink",
});
if (verifyErr || !sessionData.session) {
  console.error("Verify err:", verifyErr?.message);
  process.exit(1);
}

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

console.log(`Capturing ${tasks.length} baseline mobile screenshots into tests/visual/baseline-mobile/...`);

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

  const outPath = path.join(mobileBaselineDir, task.filename);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`-> Saved mobile baseline: ${task.filename}`);
  await context.close();
}

await browser.close();
console.log("✔ Mobile baseline capture complete!");

