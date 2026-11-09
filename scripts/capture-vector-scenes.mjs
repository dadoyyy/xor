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

// Dedicated test user: xor_automator
const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

if (!profile) {
  throw new Error("xor_automator profile not found");
}

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
  { name: "1920x1080", width: 1920, height: 1080, desktop: true },
  { name: "1440x900", width: 1440, height: 900, desktop: true },
  { name: "1366x768", width: 1366, height: 768, desktop: true },
  { name: "1024x768", width: 1024, height: 768, desktop: false },
  { name: "390x844", width: 390, height: 844, desktop: false },
];

const SCENES = ["morning", "afternoon", "evening"];

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

const results = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2, // 2x retina display for super-crisp screenshots
  });
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();

  for (const scene of SCENES) {
    const targetUrl = `${BASE_URL}/home?scene=${scene}`;
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-home-hero='true']", { timeout: 15000 });
    // Wait for mascot image to load
    await page.waitForTimeout(1000);

    // Verify desktop viewport scroll height (sheet scrolling test)
    const scrollMetrics = await page.evaluate(() => {
      const mainSheet = document.querySelector("main") || document.querySelector("[data-home-sheet='true']");
      const hero = document.querySelector("[data-home-hero='true']");
      return {
        bodyScrollHeight: document.body.scrollHeight,
        windowHeight: window.innerHeight,
        sheetScrollHeight: mainSheet ? mainSheet.scrollHeight : null,
        sheetClientHeight: mainSheet ? mainSheet.clientHeight : null,
        heroRect: hero ? hero.getBoundingClientRect() : null,
      };
    });

    const filename = `vector_${scene}_${vp.name}.png`;
    const filepath = path.join(ARTIFACT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });

    results.push({
      viewport: vp.name,
      scene,
      desktop: vp.desktop,
      hasScroll: scrollMetrics.sheetScrollHeight
        ? scrollMetrics.sheetScrollHeight > scrollMetrics.sheetClientHeight
        : scrollMetrics.bodyScrollHeight > scrollMetrics.windowHeight,
      heroHeight: scrollMetrics.heroRect?.height,
      file: filename,
    });
  }

  await context.close();
}

await browser.close();

console.log(JSON.stringify(results, null, 2));

