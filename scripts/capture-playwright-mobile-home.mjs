import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const artifactDir = "C:\\Users\\Mark Anton Camoro\\.gemini\\antigravity\\brain\\418ee67f-d099-4d47-9181-c951c63120db";

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

// Look up dedicated test user "xor_automator"
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

// Generate exact SSR cookies expected by @supabase/ssr
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
  args: ["--no-sandbox", "--disable-gpu"],
});

const targets = [
  // Phone widths (afternoon scene)
  { filename: "home_mobile_320x640.png", width: 320, height: 640, isMobile: true, url: `${BASE_URL}/home?scene=afternoon` },
  { filename: "home_mobile_360x740.png", width: 360, height: 740, isMobile: true, url: `${BASE_URL}/home?scene=afternoon` },
  { filename: "home_mobile_390x844.png", width: 390, height: 844, isMobile: true, url: `${BASE_URL}/home?scene=afternoon` },
  { filename: "home_mobile_412x915.png", width: 412, height: 915, isMobile: true, url: `${BASE_URL}/home?scene=afternoon` },
  { filename: "home_mobile_430x932.png", width: 430, height: 932, isMobile: true, url: `${BASE_URL}/home?scene=afternoon` },

  // Above-the-fold test on short phone
  { filename: "home_mobile_390x667_fold.png", width: 390, height: 667, isMobile: true, url: `${BASE_URL}/home?scene=afternoon` },

  // Morning & evening scenes
  { filename: "home_mobile_morning_390x844.png", width: 390, height: 844, isMobile: true, url: `${BASE_URL}/home?scene=morning` },
  { filename: "home_mobile_evening_390x844.png", width: 390, height: 844, isMobile: true, url: `${BASE_URL}/home?scene=evening` },

  // Desktop & Tablet regression verification
  { filename: "home_tablet_768x1024.png", width: 768, height: 1024, isMobile: false, url: `${BASE_URL}/home?scene=afternoon` },
  { filename: "home_desktop_1440x900.png", width: 1440, height: 900, isMobile: false, url: `${BASE_URL}/home?scene=afternoon` },
];

for (const t of targets) {
  console.log(`Capturing ${t.filename} (${t.width}x${t.height})...`);
  const context = await browser.newContext({
    viewport: { width: t.width, height: t.height },
    isMobile: t.isMobile,
    hasTouch: t.isMobile,
    deviceScaleFactor: 1,
  });
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();
  await page.goto(t.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const outPath = path.join(artifactDir, t.filename);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`-> Saved ${t.filename}`);
  await context.close();
}

// Long username & long subtitle test
console.log("Capturing home_mobile_long_username_390x844.png...");
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/home?scene=afternoon`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const h1 = document.querySelector('[data-home-hero="true"] h1');
    if (h1) {
      h1.innerHTML = 'Good afternoon, <span class="text-[#6D3BE8]">Alexander_The_Great_Scholar</span>!';
    }
    const sub = document.querySelector('[data-home-hero="true"] p');
    if (sub) {
      sub.innerText = 'Keep your 99-day study streak going with a comprehensive review of all subject materials today.';
    }
  });
  await page.waitForTimeout(500);
  const outPath = path.join(artifactDir, "home_mobile_long_username_390x844.png");
  await page.screenshot({ path: outPath, fullPage: false });
  console.log("-> Saved home_mobile_long_username_390x844.png");
  await context.close();
}

await browser.close();
console.log("Playwright capture completed successfully!");
process.exit(0);

